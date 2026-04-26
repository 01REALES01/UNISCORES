import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

const INDIVIDUAL_SPORTS = ['Tenis', 'Tenis de Mesa', 'Natación', 'Ajedrez'];
const ELIM_PHASES = ['primera_ronda', 'dieciseisavos', 'octavos', 'cuartos', 'semifinal', 'final'] as const;

// POST /api/admin/auto-advance/force
// Manually triggers bracket advancement from a completed phase.
// Body: { disciplina_id, genero, fase }
export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('roles')
      .eq('id', user.id)
      .single();
    if (!((profile?.roles ?? []) as string[]).includes('admin')) {
      return NextResponse.json({ error: 'Solo admins pueden forzar avance de brackets' }, { status: 403 });
    }

    const body = await request.json();
    const { disciplina_id, genero, fase } = body;

    if (!disciplina_id || !genero || !fase) {
      return NextResponse.json({ error: 'disciplina_id, genero y fase son requeridos' }, { status: 400 });
    }

    const { data: disciplina } = await supabase
      .from('disciplinas')
      .select('name')
      .eq('id', disciplina_id)
      .single();
    const sportName = disciplina?.name || 'Unknown';

    // Diagnostic: count all matches in this phase
    const { data: allInFase } = await supabase
      .from('partidos')
      .select('id, estado, bracket_order, equipo_a, equipo_b, delegacion_a, delegacion_b')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .eq('fase', fase);

    const { data: nextFaseMatches } = await supabase
      .from('partidos')
      .select('id, estado, bracket_order, equipo_a, equipo_b')
      .eq('disciplina_id', disciplina_id)
      .eq('genero', genero)
      .in('fase', ELIM_PHASES.slice(ELIM_PHASES.indexOf(fase as any) + 1));

    const result = await advanceBracketWinners(supabase, disciplina_id, genero, fase, sportName);

    return NextResponse.json({
      advanced: result !== null,
      from_fase: fase,
      next_fase: result,
      sport: sportName,
      message: result
        ? `✅ Avance forzado: ${fase} → ${result}`
        : `❌ No se pudo avanzar desde ${fase}`,
      debug: {
        matches_in_fase: allInFase?.map(m => ({
          id: m.id,
          estado: m.estado,
          bracket_order: m.bracket_order,
          equipo_a: m.equipo_a,
          equipo_b: m.equipo_b,
        })),
        next_fase_matches: nextFaseMatches?.map(m => ({
          id: m.id,
          estado: m.estado,
          bracket_order: m.bracket_order,
          equipo_a: m.equipo_a,
          equipo_b: m.equipo_b,
        })),
      },
    }, { status: result !== null ? 200 : 422 });
  } catch (err: any) {
    console.error('Force advance error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

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
      .eq('genero', genero)
      .eq('fase', currentFase)
      .eq('estado', 'finalizado');
    if (categoria) finalizedQuery = finalizedQuery.eq('categoria', categoria);
    const { data: finalized, error: matchError } = await finalizedQuery;

    if (matchError || !finalized?.length) {
      console.warn(`No finalized matches in ${currentFase}:`, matchError);
      return null;
    }

    // Assign positional bracket_order to finalized matches that have null, and persist
    const allFinalizedNullOrder = finalized.every((m: any) => m.bracket_order === null || m.bracket_order === undefined);
    if (allFinalizedNullOrder) {
      for (let i = 0; i < finalized.length; i++) {
        finalized[i].bracket_order = i;
        await supabase.from('partidos').update({ bracket_order: i }).eq('id', finalized[i].id);
      }
    }

    const currentIdx = ELIM_PHASES.indexOf(currentFase as any);
    let nextFase: string | null = null;
    let nextRoundMatches: any[] | null = null;

    for (let i = currentIdx + 1; i < ELIM_PHASES.length; i++) {
      const candidate = ELIM_PHASES[i];
      let q = supabase
        .from('partidos')
        .select('*')
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
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

    // Deduplicate by bracket_order, but treat null as unique (don't merge null slots)
    const seenOrders = new Set<number>();
    const uniqueNextRound = nextRoundMatches.filter((m: any) => {
      if (m.bracket_order === null || m.bracket_order === undefined) return true;
      if (seenOrders.has(m.bracket_order)) return false;
      seenOrders.add(m.bracket_order);
      return true;
    });

    // Assign positional bracket_order to any matches that still have null, and persist
    let nextIdx = Math.max(-1, ...uniqueNextRound.filter((m: any) => m.bracket_order != null).map((m: any) => m.bracket_order)) + 1;
    // If ALL were null, nextIdx is 0
    if (uniqueNextRound.every((m: any) => m.bracket_order == null)) nextIdx = 0;
    for (const m of uniqueNextRound) {
      if (m.bracket_order === null || m.bracket_order === undefined) {
        m.bracket_order = nextIdx++;
        await supabase.from('partidos').update({ bracket_order: m.bracket_order }).eq('id', m.id);
      }
    }

    const isIndividual = INDIVIDUAL_SPORTS.includes(sportName);

    for (const match of finalized) {
      const md = match.marcador_detalle || {};
      const scoreA = md.goles_a ?? md.sets_a ?? md.total_a ?? md.puntos_a ?? 0;
      const scoreB = md.goles_b ?? md.sets_b ?? md.total_b ?? md.puntos_b ?? 0;
      const winnerA = scoreA !== scoreB
        ? scoreA > scoreB
        : (md.penales_a ?? 0) > (md.penales_b ?? 0);

      const winnerTeam = winnerA
        ? (match.delegacion_a || match.equipo_a)
        : (match.delegacion_b || match.equipo_b);
      const winnerDelegacion = winnerA ? match.delegacion_a_id : match.delegacion_b_id;
      const winnerCarrera = winnerA ? match.carrera_a_id : match.carrera_b_id;
      const winnerAthlete = winnerA ? match.athlete_a_id : match.athlete_b_id;

      const nextSlot = Math.floor((match.bracket_order ?? 0) / 2);
      const ab = (match.bracket_order ?? 0) % 2 === 0 ? 'a' : 'b';
      const side = `equipo_${ab}`;

      const nextMatch = uniqueNextRound.find((m: any) => m.bracket_order === nextSlot);
      if (!nextMatch) {
        console.warn(`No next match found for bracket_order ${nextSlot} (from ${match.bracket_order})`);
        continue;
      }

      const updates: any = {
        [side]: winnerTeam,
        [`delegacion_${ab}`]: winnerTeam,
      };
      if (winnerDelegacion) updates[`delegacion_${ab}_id`] = winnerDelegacion;
      if (winnerCarrera) updates[`carrera_${ab}_id`] = winnerCarrera;
      if (isIndividual && winnerAthlete) updates[`athlete_${ab}_id`] = winnerAthlete;

      const { error: updateError } = await supabase
        .from('partidos')
        .update(updates)
        .eq('id', nextMatch.id);

      if (updateError) {
        console.error(`Failed to advance winner to ${nextMatch.id}:`, updateError);
        return null;
      }

      nextMatch[side] = winnerTeam;
    }

    return nextFase;
  } catch (err: any) {
    console.error('Bracket advancement error:', err);
    return null;
  }
}
