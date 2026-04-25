import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getBracketConfig, normalizeBracketGrupoKey } from '@/lib/bracket-config';
import { calculateStandings, compareStandings } from '@/modules/matches/utils/standings';

// ─── Auto-advance logic: when all matches in a phase are finalized, automatically
// advance teams/players to the next round.

// Ordered from earliest to latest elimination round
const ELIM_PHASES = ['primera_ronda', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'] as const;

const NEXT_FASE: Record<string, string> = {
  grupos: 'cuartos',    // Config may override (some sports go to semifinal or octavos)
  primera_ronda: 'dieciseisavos',
  dieciseisavos: 'octavos',
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
    const { partido_id, disciplina_id, genero, fase: faseOverride, categoria: categoriaOverride } = body;

    if (!disciplina_id || !genero) {
      return NextResponse.json({ error: 'Missing disciplina_id or genero' }, { status: 400 });
    }

    let currentFase: string;
    let sportName: string;
    let categoria: string | undefined;

    if (partido_id) {
      // Automatic mode — triggered after a specific match is finalized
      const { data: match, error: matchError } = await supabase
        .from('partidos')
        .select('id, disciplina_id, genero, categoria, fase, bracket_order, estado, equipo_a, equipo_b, delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id, athlete_a_id, athlete_b_id, marcador_detalle, disciplinas(name)')
        .eq('id', partido_id)
        .single() as any;

      if (matchError || !match) {
        return NextResponse.json({ error: 'Partido not found' }, { status: 404 });
      }
      currentFase = match.fase;
      sportName = match.disciplinas?.name || 'Unknown';
      categoria = match.categoria;
    } else {
      // Manual mode — find the most advanced complete phase for this disciplina/genero
      const { data: disc } = await supabase.from('disciplinas').select('name').eq('id', disciplina_id).single();
      if (!disc) return NextResponse.json({ error: 'Disciplina not found' }, { status: 404 });
      sportName = disc.name;
      categoria = categoriaOverride;

      if (faseOverride) {
        currentFase = faseOverride;
      } else {
        const phasePriority = ['semifinal', 'cuartos', 'octavos', 'primera_ronda', 'grupos'];
        let resolvedFase: string | null = null;
        for (const candidate of phasePriority) {
          let q = supabase.from('partidos').select('id, estado').eq('disciplina_id', disciplina_id).ilike('genero', String(genero).trim()).eq('fase', candidate);
          if (categoria) q = q.eq('categoria', categoria);
          const { data: rows } = await q;
          if (!rows?.length) continue;
          if (rows.every((r: any) => r.estado === 'finalizado')) { resolvedFase = candidate; break; }
        }
        if (!resolvedFase) {
          return NextResponse.json({ advanced: false, reason: 'No hay ninguna fase completa para avanzar' });
        }
        currentFase = resolvedFase;
      }
    }

    // Count unfinalized matches in this phase
    let unfinalizedQuery = supabase
      .from('partidos')
      .select('id', { count: 'exact' })
      .eq('disciplina_id', disciplina_id)
      .ilike('genero', String(genero).trim())
      .eq('fase', currentFase)
      .neq('estado', 'finalizado');
    if (categoria) unfinalizedQuery = unfinalizedQuery.eq('categoria', categoria);
    const { data: unfinalized, error: countError } = await unfinalizedQuery;

    if (countError) {
      return NextResponse.json({ error: 'Error counting unfinalized matches' }, { status: 500 });
    }

    if ((unfinalized?.length || 0) > 0) {
      return NextResponse.json({
        advanced: false,
        reason: `${unfinalized?.length || 0} partido(s) aún pendientes en ${currentFase}`,
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
    } else if (['primera_ronda', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal'].includes(currentFase)) {
      const result = await advanceBracketWinners(supabase, disciplina_id, genero, currentFase, sportName, categoria);
      if (result) {
        advanceSuccess = true;
        nextFase = result;
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
      .ilike('genero', String(genero).trim())
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
      const grupoMatches = groupMatches.filter((m: any) => normalizeBracketGrupoKey(m.grupo) === grupoName);
      if (grupoMatches.length > 0) {
        standingsByGroup[grupoName] = calculateStandings(grupoMatches, sportName, {});
      }
    }

    // Build delegacion lookup from group matches
    const teamToDelegacion = new Map<string, { id: any; carrera_id: any }>();
    for (const m of groupMatches) {
      const nameA = m.delegacion_a || m.equipo_a;
      const nameB = m.delegacion_b || m.equipo_b;
      if (nameA && m.delegacion_a_id) teamToDelegacion.set(nameA, { id: m.delegacion_a_id, carrera_id: m.carrera_a_id });
      if (nameB && m.delegacion_b_id) teamToDelegacion.set(nameB, { id: m.delegacion_b_id, carrera_id: m.carrera_b_id });
    }

    // Fetch eliminatory matches WITH their current placeholder text
    let elimQuery = supabase
      .from('partidos')
      .select('id, bracket_order, equipo_a, equipo_b')
      .eq('disciplina_id', disciplina_id)
      .ilike('genero', String(genero).trim())
      .eq('fase', config.eliminatoryPhase)
      .order('bracket_order', { ascending: true });
    if (categoria) elimQuery = elimQuery.eq('categoria', categoria);
    const { data: eliminatoryMatches, error: elimError } = await elimQuery;

    if (elimError || !eliminatoryMatches?.length) {
      console.warn('No eliminatory matches found');
      return false;
    }

    // parseSlot resolves "1ro. GRUPO A" → TeamStanding (same logic as sorteo/resolver)
    const parseSlot = (slot: string): any => {
      const upper = (slot || '').toUpperCase();
      const posMatch = upper.match(/^(\d+)/);
      const grupoMatch = upper.match(/GRUPO\s*([A-Z])/);
      if (!posMatch || !grupoMatch) return undefined;
      const pos = parseInt(posMatch[1], 10) - 1;
      const grupo = grupoMatch[1];
      return (standingsByGroup[grupo] || [])[pos];
    };

    let anyAssigned = false;
    for (const match of eliminatoryMatches) {
      const teamA = parseSlot(match.equipo_a || '');
      const teamB = parseSlot(match.equipo_b || '');
      if (!teamA || !teamB) continue;

      const delA = teamToDelegacion.get(teamA.team);
      const delB = teamToDelegacion.get(teamB.team);
      const updates: any = {
        equipo_a: teamA.team,
        equipo_b: teamB.team,
        delegacion_a: teamA.team,
        delegacion_b: teamB.team,
      };
      if (delA?.id) { updates.delegacion_a_id = delA.id; updates.carrera_a_id = delA.carrera_id; }
      if (delB?.id) { updates.delegacion_b_id = delB.id; updates.carrera_b_id = delB.carrera_id; }

      const { error: updateError } = await supabase.from('partidos').update(updates).eq('id', match.id);
      if (updateError) {
        console.error(`Failed to update match ${match.id}:`, updateError);
        return false;
      }
      anyAssigned = true;
    }

    return anyAssigned;
  } catch (err: any) {
    console.error('Group advancement error:', err);
    return false;
  }
}

// ─── Parse "GANADOR LLAVE A" / "GANADOR CUARTOS 1" → { role, key }
function parseBracketPlaceholder(slot: string | null | undefined): { role: 'winner' | 'loser'; key: string } | null {
  if (!slot) return null;
  const upper = String(slot).toUpperCase().trim();
  const m = upper.match(/^(GANADOR|PERDEDOR)\s+(?:LLAVES?|BRACKETS?|PARTIDOS?|MATCH|CUARTOS?|SEMIS?|SEMIFINALES?|OCTAVOS?|RONDA)?\s*(.+)$/);
  if (!m) return null;
  const key = m[2].trim();
  if (!key) return null;
  return { role: m[1] === 'GANADOR' ? 'winner' : 'loser', key };
}

function normalizeBracketKey(k: string): string {
  return String(k).toUpperCase().replace(/^(LLAVE|BRACKET|PARTIDO|MATCH|CUARTOS?|OCTAVOS?)\s+/, '').trim();
}

// ─── Advance winners from current bracket phase to next phase
// Returns the actual next phase name on success, or null on failure.
async function advanceBracketWinners(
  supabase: any,
  disciplina_id: number,
  genero: string,
  currentFase: string,
  sportName: string,
  categoria?: string
): Promise<string | null> {
  try {
    let finalizedQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .ilike('genero', String(genero).trim())
      .eq('fase', currentFase)
      .eq('estado', 'finalizado');
    if (categoria) finalizedQuery = finalizedQuery.eq('categoria', categoria);
    const { data: finalized, error: matchError } = await finalizedQuery;

    if (matchError || !finalized?.length) {
      console.warn('No finalized matches in bracket');
      return null;
    }

    // Walk ELIM_PHASES to find the next round that has matches in the DB
    const currentIdx = ELIM_PHASES.indexOf(currentFase as any);
    let nextFase: string | null = null;
    let nextRoundMatches: any[] | null = null;

    for (let i = currentIdx + 1; i < ELIM_PHASES.length; i++) {
      const candidate = ELIM_PHASES[i];
      let q = supabase
        .from('partidos')
        .select('*')
        .eq('disciplina_id', disciplina_id)
        .ilike('genero', String(genero).trim())
        .eq('fase', candidate)
        .order('bracket_order', { ascending: true });
      if (categoria) q = q.eq('categoria', categoria);
      const { data, error } = await q;
      if (!error && data?.length) {
        nextFase = candidate;
        nextRoundMatches = data;
        break;
      }
    }

    if (!nextFase || !nextRoundMatches?.length) {
      console.warn(`No next round matches found after ${currentFase}`);
      return null;
    }

    const isIndividual = INDIVIDUAL_SPORTS.includes(sportName);

    // ── Index finalized results by grupo key AND bracket_order ────────────────
    type Side = { team: string; delegacion_id: any; carrera_id: any; athlete_id: any };
    type Result = { winner: Side; loser: Side };

    const resultsByKey = new Map<string, Result>();
    const resultsByOrder = new Map<number, Result>();

    for (const match of finalized) {
      const md = match.marcador_detalle || {};
      const sA = md.goles_a ?? md.sets_a ?? md.total_a ?? md.puntos_a ?? 0;
      const sB = md.goles_b ?? md.sets_b ?? md.total_b ?? md.puntos_b ?? 0;
      const winnerA = sA !== sB ? sA > sB : (md.penales_a ?? 0) > (md.penales_b ?? 0);

      const result: Result = {
        winner: { team: winnerA ? match.equipo_a : match.equipo_b, delegacion_id: winnerA ? match.delegacion_a_id : match.delegacion_b_id, carrera_id: winnerA ? match.carrera_a_id : match.carrera_b_id, athlete_id: winnerA ? match.athlete_a_id : match.athlete_b_id },
        loser:  { team: winnerA ? match.equipo_b : match.equipo_a, delegacion_id: winnerA ? match.delegacion_b_id : match.delegacion_a_id, carrera_id: winnerA ? match.carrera_b_id : match.carrera_a_id, athlete_id: winnerA ? match.athlete_b_id : match.athlete_a_id },
      };

      if (match.grupo) {
        const upper = String(match.grupo).toUpperCase().trim();
        resultsByKey.set(upper, result);
        const stripped = normalizeBracketKey(upper);
        if (stripped !== upper) resultsByKey.set(stripped, result);
      }
      if (typeof match.bracket_order === 'number') {
        resultsByOrder.set(match.bracket_order, result);
      }
    }

    const applySide = (updates: Record<string, any>, ab: 'a' | 'b', src: Side) => {
      updates[`equipo_${ab}`] = src.team;
      if (src.delegacion_id) updates[`delegacion_${ab}_id`] = src.delegacion_id;
      if (src.carrera_id) updates[`carrera_${ab}_id`] = src.carrera_id;
      if (isIndividual && src.athlete_id) updates[`athlete_${ab}_id`] = src.athlete_id;
    };

    let anyAdvance = false;

    for (const nextMatch of nextRoundMatches) {
      const updates: Record<string, any> = {};

      for (const ab of ['a', 'b'] as const) {
        const current = nextMatch[`equipo_${ab}`];
        const parsed = parseBracketPlaceholder(current);
        let result: Result | undefined;
        let role: 'winner' | 'loser' = 'winner';

        if (parsed) {
          // Placeholder strategy — look up by bracket key from the next-round's equipo value
          const keyUpper = parsed.key.toUpperCase();
          const keyStripped = normalizeBracketKey(keyUpper);
          result = resultsByKey.get(keyUpper) ?? resultsByKey.get(keyStripped)
            ?? resultsByKey.get(`LLAVE ${keyStripped}`) ?? resultsByKey.get(`CUARTOS ${keyStripped}`)
            ?? resultsByKey.get(`CUARTO ${keyStripped}`) ?? resultsByKey.get(`BRACKET ${keyStripped}`);
          role = parsed.role;
        } else if (!current || current === 'TBD') {
          // bracket_order fallback — for sports where bracket_order is explicitly set (e.g. Tenis)
          if (typeof nextMatch.bracket_order === 'number') {
            const sideIdx = ab === 'a' ? 0 : 1;
            result = resultsByOrder.get(nextMatch.bracket_order * 2 + sideIdx);
          }
        } else {
          // Slot already has a real team name — leave it
          continue;
        }

        if (!result) continue;
        applySide(updates, ab, role === 'winner' ? result.winner : result.loser);
      }

      if (Object.keys(updates).length === 0) continue;

      const { error: updateError } = await supabase.from('partidos').update(updates).eq('id', nextMatch.id);
      if (updateError) {
        console.error(`Failed to advance winner to ${nextMatch.id}:`, updateError);
        continue;
      }
      // Update in-memory so subsequent iterations see the filled slot
      Object.assign(nextMatch, updates);
      anyAdvance = true;
    }

    if (!anyAdvance) return null;

    // When advancing from semifinal, also place losers into tercer_puesto match
    if (currentFase === 'semifinal') {
      let tercerQuery = supabase
        .from('partidos')
        .select('*')
        .eq('disciplina_id', disciplina_id)
        .ilike('genero', String(genero).trim())
        .eq('fase', 'tercer_puesto');
      if (categoria) tercerQuery = tercerQuery.eq('categoria', categoria);
      const { data: tercerMatches } = await tercerQuery;
      const tercerMatch = tercerMatches?.[0];

      if (tercerMatch) {
        const sortedSemis = [...finalized].sort((a, b) => a.bracket_order - b.bracket_order);
        for (let i = 0; i < sortedSemis.length; i++) {
          const semi = sortedSemis[i];
          const md = semi.marcador_detalle || {};
          const sA = md.goles_a ?? md.sets_a ?? md.total_a ?? md.puntos_a ?? 0;
          const sB = md.goles_b ?? md.sets_b ?? md.total_b ?? md.puntos_b ?? 0;
          const loserIsA = sA !== sB ? sA < sB : (md.penales_a ?? 0) < (md.penales_b ?? 0);

          const loserTeam = loserIsA ? semi.equipo_a : semi.equipo_b;
          const loserDelegacion = loserIsA ? semi.delegacion_a_id : semi.delegacion_b_id;
          const loserCarrera = loserIsA ? semi.carrera_a_id : semi.carrera_b_id;
          const loserAthlete = loserIsA ? semi.athlete_a_id : semi.athlete_b_id;

          const side3 = i === 0 ? 'a' : 'b';
          const updates3: any = { [`equipo_${side3}`]: loserTeam };
          if (loserDelegacion) updates3[`delegacion_${side3}_id`] = loserDelegacion;
          if (loserCarrera) updates3[`carrera_${side3}_id`] = loserCarrera;
          if (isIndividual && loserAthlete) updates3[`athlete_${side3}_id`] = loserAthlete;

          await supabase
            .from('partidos')
            .update(updates3)
            .eq('id', tercerMatch.id);
        }
        console.log('Losers placed into tercer_puesto match');
      }
    }

    return nextFase;
  } catch (err: any) {
    console.error('Bracket advancement error:', err);
    return null;
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
      .ilike('genero', String(genero).trim())
      .eq('fase', 'final')
      .eq('estado', 'finalizado');
    if (categoria) finalQuery = finalQuery.eq('categoria', categoria);
    const { data: finalMatch, error: finalError } = await finalQuery.single();

    let tercerQuery = supabase
      .from('partidos')
      .select('*')
      .eq('disciplina_id', disciplina_id)
      .ilike('genero', String(genero).trim())
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
    const finalWinnerA = scoreA !== scoreB
      ? scoreA > scoreB
      : (md.penales_a ?? 0) > (md.penales_b ?? 0);

    const firstTeam = finalWinnerA ? finalMatch.equipo_a : finalMatch.equipo_b;
    const secondTeam = finalWinnerA ? finalMatch.equipo_b : finalMatch.equipo_a;
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
