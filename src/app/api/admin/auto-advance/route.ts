import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBracketConfig } from '@/lib/bracket-config';
import { calculateStandings, compareStandings } from '@/modules/matches/utils/standings';

// ─── Auto-advance logic: when all matches in a phase are finalized, automatically
// advance teams/players to the next round.

const NEXT_FASE: Record<string, string> = {
  grupos: 'cuartos',    // Config may override (some sports go to semifinal or octavos)
  octavos: 'cuartos',
  cuartos: 'semifinal',
  semifinal: 'final',
};

const INDIVIDUAL_SPORTS = ['Tenis', 'Tenis de Mesa', 'Natación', 'Ajedrez'];

type Partido = {
  id: string;
  disciplina_id: number;
  genero: string;
  fase: string;
  bracket_order: number;
  estado: string;
  equipo_a: string;
  equipo_b: string;
  delegacion_a_id?: string;
  delegacion_b_id?: string;
  carrera_a_id?: number;
  carrera_b_id?: number;
  athlete_a_id?: string;
  athlete_b_id?: string;
  marcador_detalle: any;
  disciplinas: { name: string };
};

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => { } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { partido_id, disciplina_id, genero } = body;

    if (!partido_id || !disciplina_id || !genero) {
      return NextResponse.json({ error: 'Missing partido_id, disciplina_id, or genero' }, { status: 400 });
    }

    // Fetch the match and its discipline
    const { data: match, error: matchError } = await supabase
      .from('partidos')
      .select('id, disciplina_id, genero, categoria, fase, bracket_order, estado, equipo_a, equipo_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id, marcador_detalle, disciplinas(name)')
      .eq('id', partido_id)
      .single() as any;

    if (matchError || !match) {
      return NextResponse.json({ error: 'Partido not found' }, { status: 404 });
    }

    const currentFase = match.fase;
    const sportName = match.disciplinas?.name || 'Unknown';
    const categoria = match.categoria;  // For Tenis: 'intermedio' | 'avanzado'

    // Count unfinalized matches in this phase (filter by categoria if it exists)
    let unfinalizedQuery = supabase
      .from('partidos')
      .select('id', { count: 'exact' })
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', currentFase)
      .neq('estado', 'finalizado');
    if (categoria) unfinalizedQuery = unfinalizedQuery.eq('categoria', categoria);
    const { data: unfinalized, error: countError } = await unfinalizedQuery;

    if (countError) {
      return NextResponse.json({ error: 'Error counting unfinalized matches' }, { status: 500 });
    }

    // If there are still unfinalized matches, don't advance
    if ((unfinalized?.length || 0) > 0) {
      return NextResponse.json({
        advanced: false,
        reason: `${unfinalized?.length || 0} match(es) still pending in ${currentFase}`,
      });
    }

    // All matches in this phase are finalized — determine next action
    let nextFase: string | null = null;
    let advanceSuccess = false;

    if (currentFase === 'grupos') {
      advanceSuccess = await handleGroupAdvancement(supabase, disciplina_id, genero, sportName, categoria);
      if (advanceSuccess) {
        const config = getBracketConfig(sportName, genero);
        nextFase = config?.eliminatoryPhase || 'cuartos';
      }
    } else if (currentFase === 'final') {
      advanceSuccess = await calculateFinalPositions(supabase, disciplina_id, genero, sportName, categoria);
      nextFase = 'posiciones';
    } else if (['cuartos', 'octavos', 'semifinal'].includes(currentFase)) {
      advanceSuccess = await advanceBracketWinners(supabase, disciplina_id, genero, currentFase, sportName, categoria);
      if (advanceSuccess) {
        nextFase = NEXT_FASE[currentFase] || 'final';
      }
    } else if (currentFase === 'primera_ronda') {
      advanceSuccess = await advanceBracketWinners(supabase, disciplina_id, genero, currentFase, sportName, categoria);
      if (advanceSuccess) {
        nextFase = 'octavos';
      }
    }

    return NextResponse.json({
      advanced: advanceSuccess,
      next_fase: nextFase,
      message: advanceSuccess ? `✅ All matches finalized. Advanced to ${nextFase}.` : '❌ Advancement failed.',
    });
  } catch (err: any) {
    console.error('Auto-advance error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

// ─── Handle group stage → eliminatory bracket resolution
async function handleGroupAdvancement(
  supabase: any,
  disciplina_id: number,
  genero: string,
  sportName: string,
  categoria?: string
): Promise<boolean> {
  try {
    // Use the existing resolver logic by calling its endpoint
    // For now, we'll replicate the core logic here to avoid HTTP loop
    const config = getBracketConfig(sportName, genero);
    if (!config) {
      console.warn(`No bracket config for ${sportName}|${genero}`);
      return false;
    }

    // Fetch all finalized group matches
    let groupQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', 'grupos')
      .eq('estado', 'finalizado');
    if (categoria) groupQuery = groupQuery.eq('categoria', categoria);
    const { data: groupMatches, error: matchError } = await groupQuery;

    if (matchError || !groupMatches?.length) {
      console.warn('No group matches to resolve');
      return false;
    }

    // Calculate standings per group (reuse existing utility)
    // For each group, calculate standings using the disciplinas standings logic
    const standingsByGroup: Record<string, any[]> = {};
    for (const grupoName of config.groups) {
      const grupoMatches = groupMatches.filter((m: any) => m.grupo === grupoName);
      if (grupoMatches.length > 0) {
        standingsByGroup[grupoName] = calculateStandings(grupoMatches, sportName, {});
      }
    }

    // Pick qualified teams
    const qualified: any[] = [];
    for (const grupoName of config.groups) {
      const standings = standingsByGroup[grupoName] || [];
      const topTeams = standings.slice(0, config.qualifyPerGroup);
      qualified.push(...topTeams.map((t: any) => ({ ...t, grupo: grupoName })));
    }

    // If unified_table, sort all together and optionally add best thirds
    let finalQualified = qualified;
    if (config.type === 'unified_table') {
      finalQualified = qualified.sort((a: any, b: any) =>
        compareStandings(a, b, sportName)
      );

      if (config.bestThirds && config.bestThirds > 0) {
        const thirds: any[] = [];
        for (const grupoName of config.groups) {
          const standings = standingsByGroup[grupoName] || [];
          if (standings.length >= 3) {
            thirds.push(standings[2]);
          }
        }
        thirds.sort((a: any, b: any) => compareStandings(a, b, sportName));
        finalQualified.push(...thirds.slice(0, config.bestThirds));
      }
    } else if (config.type === 'direct_cross') {
      // Keep grouped for 1A vs 2B / 1B vs 2A
      // No reordering needed
    }

    // Fetch eliminatory matches to populate
    let elimQuery = supabase
      .from('partidos')
      .select('id, bracket_order')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', config.eliminatoryPhase)
      .order('bracket_order', { ascending: true });
    if (categoria) elimQuery = elimQuery.eq('categoria', categoria);
    const { data: eliminatoryMatches, error: elimError } = await elimQuery;

    if (elimError || !eliminatoryMatches?.length) {
      console.warn('No eliminatory matches found');
      return false;
    }

    // Assign qualified teams to bracket slots based on config type
    for (let i = 0; i < eliminatoryMatches.length && i * 2 < finalQualified.length; i++) {
      const match = eliminatoryMatches[i];
      const teamA = finalQualified[i * 2];
      const teamB = finalQualified[i * 2 + 1];

      if (!teamA || !teamB) continue;

      const updates: any = {
        equipo_a: teamA.team,
        equipo_b: teamB.team,
      };

      // Copy delegacion/carrera IDs if available
      if (teamA.delegacion_id) updates.delegacion_a_id = teamA.delegacion_id;
      if (teamB.delegacion_id) updates.delegacion_b_id = teamB.delegacion_id;
      if (teamA.carrera_id) updates.carrera_a_id = teamA.carrera_id;
      if (teamB.carrera_id) updates.carrera_b_id = teamB.carrera_id;

      const { error: updateError } = await supabase
        .from('partidos')
        .update(updates)
        .eq('id', match.id);

      if (updateError) {
        console.error(`Failed to update match ${match.id}:`, updateError);
        return false;
      }
    }

    return true;
  } catch (err: any) {
    console.error('Group advancement error:', err);
    return false;
  }
}

// ─── Advance winners from current bracket phase to next phase
async function advanceBracketWinners(
  supabase: any,
  disciplina_id: number,
  genero: string,
  currentFase: string,
  sportName: string,
  categoria?: string
): Promise<boolean> {
  try {
    // Fetch all finalized matches in current phase
    let finalizedQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', currentFase)
      .eq('estado', 'finalizado');
    if (categoria) finalizedQuery = finalizedQuery.eq('categoria', categoria);
    const { data: finalized, error: matchError } = await finalizedQuery;

    if (matchError || !finalized?.length) {
      console.warn('No finalized matches in bracket');
      return false;
    }

    const nextFase = NEXT_FASE[currentFase];
    if (!nextFase) {
      console.warn(`No next fase for ${currentFase}`);
      return false;
    }

    // Fetch next round matches to populate
    let nextQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', nextFase)
      .order('bracket_order', { ascending: true });
    if (categoria) nextQuery = nextQuery.eq('categoria', categoria);
    const { data: nextRoundMatches, error: nextError } = await nextQuery;

    if (nextError || !nextRoundMatches?.length) {
      console.warn('No next round matches found');
      return false;
    }

    const isIndividual = INDIVIDUAL_SPORTS.includes(sportName);

    // Process each finalized match
    for (const match of finalized) {
      // Determine winner
      const md = match.marcador_detalle || {};
      const scoreA = md.goles_a ?? md.sets_a ?? md.total_a ?? md.puntos_a ?? 0;
      const scoreB = md.goles_b ?? md.sets_b ?? md.total_b ?? md.puntos_b ?? 0;
      const winnerA = scoreA > scoreB;

      const winnerTeam = winnerA ? match.equipo_a : match.equipo_b;
      const winnerDelegacion = winnerA ? match.delegacion_a_id : match.delegacion_b_id;
      const winnerCarrera = winnerA ? match.carrera_a_id : match.carrera_b_id;
      const winnerAthlete = winnerA ? match.athlete_a_id : match.athlete_b_id;

      // Calculate next slot
      const nextSlot = Math.floor(match.bracket_order / 2);
      const ab = match.bracket_order % 2 === 0 ? 'a' : 'b';  // 'a' or 'b' suffix
      const side = `equipo_${ab}`;  // 'equipo_a' or 'equipo_b'

      // Find corresponding next-round match
      const nextMatch = nextRoundMatches.find((m: any) => m.bracket_order === nextSlot);
      if (!nextMatch) continue;

      // Skip if this slot is already correctly filled (e.g. seed pre-placed by import)
      const currentValue = nextMatch[side];
      if (currentValue && currentValue !== 'TBD' && currentValue === winnerTeam) continue;

      const updates: any = { [side]: winnerTeam };

      if (winnerDelegacion) {
        updates[`delegacion_${ab}_id`] = winnerDelegacion;
      }
      if (winnerCarrera) {
        updates[`carrera_${ab}_id`] = winnerCarrera;
      }

      // For individual sports, also propagate athlete_id
      if (isIndividual && winnerAthlete) {
        updates[`athlete_${ab}_id`] = winnerAthlete;
      }

      const { error: updateError } = await supabase
        .from('partidos')
        .update(updates)
        .eq('id', nextMatch.id);

      if (updateError) {
        console.error(`Failed to advance winner to ${nextMatch.id}:`, updateError);
        return false;
      }
    }

    return true;
  } catch (err: any) {
    console.error('Bracket advancement error:', err);
    return false;
  }
}

// ─── Calculate final positions from finished bracket
async function calculateFinalPositions(
  supabase: any,
  disciplina_id: number,
  genero: string,
  sportName: string,
  categoria?: string
): Promise<boolean> {
  try {
    // Fetch finalized final and tercerPuesto matches
    let finalQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', 'final')
      .eq('estado', 'finalizado');
    if (categoria) finalQuery = finalQuery.eq('categoria', categoria);
    const { data: finalMatch, error: finalError } = await finalQuery.single();

    let tercerQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', 'tercer_puesto')
      .eq('estado', 'finalizado');
    if (categoria) tercerQuery = tercerQuery.eq('categoria', categoria);
    const { data: tercerMatch } = await tercerQuery.single();

    if (finalError || !finalMatch) {
      console.warn('No finalized final match');
      return false;
    }

    // Determine positions from final match
    const md = finalMatch.marcador_detalle || {};
    const scoreA = md.goles_a ?? md.sets_a ?? md.total_a ?? md.puntos_a ?? 0;
    const scoreB = md.goles_b ?? md.sets_b ?? md.total_b ?? md.puntos_b ?? 0;

    const firstTeam = scoreA > scoreB ? finalMatch.equipo_a : finalMatch.equipo_b;
    const secondTeam = scoreA > scoreB ? finalMatch.equipo_b : finalMatch.equipo_a;
    const thirdTeam = tercerMatch ? (
      (tercerMatch.marcador_detalle?.goles_a ?? 0) > (tercerMatch.marcador_detalle?.goles_b ?? 0)
        ? tercerMatch.equipo_a
        : tercerMatch.equipo_b
    ) : null;

    // Get points config for this sport
    const { data: pointsConfig, error: configError } = await supabase
      .from('puntos_config')
      .select('*')
      .eq('tipo_deporte', 'equipo')
      .single();

    if (configError || !pointsConfig) {
      console.warn('No points config found');
      return false;
    }

    // Upsert clasificacion_disciplina entries
    const positions = [
      { team: firstTeam, position: 1, points: pointsConfig.primer_lugar },
      { team: secondTeam, position: 2, points: pointsConfig.segundo_lugar },
      { team: thirdTeam, position: 3, points: pointsConfig.tercer_lugar },
    ];

    for (const pos of positions) {
      if (!pos.team) continue;

      // If team is a carrera name, find its ID
      const { data: carrera } = await supabase
        .from('carreras')
        .select('id')
        .ilike('nombre', `%${pos.team}%`)
        .single();

      if (carrera) {
        const { error: upsertError } = await supabase
          .from('clasificacion_disciplina')
          .upsert({
            disciplina_id,
            carrera_id: carrera.id,
            posicion: pos.position,
            puntos_totales: pos.points,
            genero,
          }, {
            onConflict: 'disciplina_id,carrera_id,genero',
          });

        if (upsertError) {
          console.error('Failed to upsert posicion:', upsertError);
          return false;
        }
      }
    }

    return true;
  } catch (err: any) {
    console.error('Final positions error:', err);
    return false;
  }
}
