import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

// Sports that use bracket matches and can have positions auto-derived
const TEAM_SPORTS = ['Fútbol', 'Baloncesto', 'Voleibol'];
const INDIVIDUAL_BRACKET_SPORTS = ['Tenis', 'Tenis de Mesa'];
// Natación and Ajedrez are general sessions — no bracket to derive from

function getTipoDeporte(disciplinaNombre: string): 'equipo' | 'individual' {
    return TEAM_SPORTS.includes(disciplinaNombre) ? 'equipo' : 'individual';
}

function hasBracket(disciplinaNombre: string): boolean {
    return TEAM_SPORTS.includes(disciplinaNombre) || INDIVIDUAL_BRACKET_SPORTS.includes(disciplinaNombre);
}

/**
 * Extract winner/loser ID arrays from a finished match.
 * Uses carrera_a_ids/carrera_b_ids (arrays) so combined teams
 * (e.g. "COM. SOCIAL/PSICOLOGÍA" → 2 carreras) generate one entry each.
 * Falls back to singular carrera_a_id/carrera_b_id if arrays are not populated.
 */
function getWinnerIds(match: {
    carrera_a_id: number | null;
    carrera_b_id: number | null;
    carrera_a_ids: number[] | null;
    carrera_b_ids: number[] | null;
    marcador_detalle: Record<string, unknown> | null;
}): { winnerIds: number[]; loserIds: number[] } {
    const det = match.marcador_detalle ?? {};
    const scoreA =
        (det.goles_a as number) ??
        (det.sets_a as number) ??
        (det.total_a as number) ??
        (det.puntos_a as number) ??
        (det.juegos_a as number) ??
        0;
    const scoreB =
        (det.goles_b as number) ??
        (det.sets_b as number) ??
        (det.total_b as number) ??
        (det.puntos_b as number) ??
        (det.juegos_b as number) ??
        0;

    // Prefer array fields; fall back to singular wrapped in array
    const sideA = match.carrera_a_ids?.length ? match.carrera_a_ids
        : match.carrera_a_id ? [match.carrera_a_id] : [];
    const sideB = match.carrera_b_ids?.length ? match.carrera_b_ids
        : match.carrera_b_id ? [match.carrera_b_id] : [];

    if (scoreA > scoreB) return { winnerIds: sideA, loserIds: sideB };
    if (scoreB > scoreA) return { winnerIds: sideB, loserIds: sideA };
    return { winnerIds: [], loserIds: [] }; // draw — shouldn't happen in finals
}

export async function POST(req: NextRequest) {
    const supabase = await createRouteSupabase();

    // ── Auth check ────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 });
    }

    // ── Input validation ──────────────────────────────────────────────────────
    let body: { disciplina_id: unknown; genero: unknown; categoria?: unknown };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
    }

    const disciplinaId = Number(body.disciplina_id);
    if (!Number.isInteger(disciplinaId) || disciplinaId <= 0) {
        return NextResponse.json({ error: 'disciplina_id inválido' }, { status: 400 });
    }

    const GENEROS_VALIDOS = ['masculino', 'femenino', 'mixto'] as const;
    const genero = body.genero as string;
    if (!GENEROS_VALIDOS.includes(genero as (typeof GENEROS_VALIDOS)[number])) {
        return NextResponse.json({ error: 'genero inválido' }, { status: 400 });
    }

    const CATEGORIAS_VALIDAS = ['principiante', 'intermedio', 'avanzado', null, undefined];
    const categoria = body.categoria as string | null | undefined;
    if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        return NextResponse.json({ error: 'categoria inválida' }, { status: 400 });
    }
    const categoriaValue = categoria ?? null;

    // ── Fetch disciplina name ─────────────────────────────────────────────────
    const { data: disciplina, error: discError } = await supabase
        .from('disciplinas')
        .select('id, name')
        .eq('id', disciplinaId)
        .single();

    if (discError || !disciplina) {
        return NextResponse.json({ error: 'Disciplina no encontrada' }, { status: 404 });
    }

    if (!hasBracket(disciplina.name)) {
        return NextResponse.json({
            error: `${disciplina.name} no tiene bracket de partidos. Ingresa las posiciones manualmente.`,
            code: 'NO_BRACKET'
        }, { status: 422 });
    }

    const tipoDeporte = getTipoDeporte(disciplina.name);

    // ── Fetch relevant matches ────────────────────────────────────────────────
    const { data: matches, error: matchError } = await supabase
        .from('partidos')
        .select('id, fase, estado, carrera_a_id, carrera_b_id, carrera_a_ids, carrera_b_ids, marcador_detalle, equipo_a, equipo_b')
        .eq('disciplina_id', disciplinaId)
        .eq('genero', genero)
        .eq('estado', 'finalizado')
        .in('fase', ['final', 'tercer_puesto']);

    if (matchError) {
        return NextResponse.json({ error: 'Error al consultar partidos', detail: matchError.message }, { status: 500 });
    }

    if (!matches || matches.length === 0) {
        return NextResponse.json({
            error: 'No hay partidos finalizados de fase "final" o "tercer_puesto" para esta disciplina.',
            code: 'NO_FINAL_MATCHES'
        }, { status: 422 });
    }

    // ── Fetch puntos_config for this sport type ───────────────────────────────
    const { data: puntosConfig, error: puntosError } = await supabase
        .from('puntos_config')
        .select('posicion, puntos')
        .eq('tipo_deporte', tipoDeporte);

    if (puntosError || !puntosConfig) {
        return NextResponse.json({ error: 'Error al obtener configuración de puntos' }, { status: 500 });
    }

    const puntosMap = Object.fromEntries(puntosConfig.map(p => [p.posicion, p.puntos]));

    // ── Derive positions from bracket results ─────────────────────────────────
    type PosicionEntry = {
        disciplina_id: number;
        carrera_id: number;
        genero: string;
        categoria: string | null;
        posicion: number;
        puntos_obtenidos: number;
        notas: string;
        created_by: string;
    };

    const entries: PosicionEntry[] = [];
    const skipped: string[] = [];

    const finalMatch = matches.find(m => m.fase === 'final');
    const tercerMatch = matches.find(m => m.fase === 'tercer_puesto');

    const pushEntries = (ids: number[], posicion: number, nota: string) => {
        for (const carreraId of ids) {
            entries.push({
                disciplina_id: disciplinaId,
                carrera_id: carreraId,
                genero,
                categoria: categoriaValue,
                posicion,
                puntos_obtenidos: puntosMap[posicion] ?? 0,
                notas: nota,
                created_by: user.id,
            });
        }
    };

    if (finalMatch) {
        const { winnerIds, loserIds } = getWinnerIds(finalMatch);

        if (winnerIds.length > 0) {
            pushEntries(winnerIds, 1, `Auto-calculado desde partido final (id: ${finalMatch.id})`);
        } else {
            skipped.push('1er lugar: empate en el partido final, no se pudo determinar');
        }

        if (loserIds.length > 0) {
            pushEntries(loserIds, 2, `Auto-calculado desde partido final (id: ${finalMatch.id})`);
        }
    } else {
        skipped.push('1er y 2do lugar: no se encontró partido de "final" finalizado');
    }

    if (tercerMatch) {
        const { winnerIds, loserIds } = getWinnerIds(tercerMatch);

        if (winnerIds.length > 0) {
            pushEntries(winnerIds, 3, `Auto-calculado desde partido tercer puesto (id: ${tercerMatch.id})`);
        }
        if (loserIds.length > 0) {
            pushEntries(loserIds, 4, `Auto-calculado desde partido tercer puesto (id: ${tercerMatch.id})`);
        }
    } else {
        skipped.push('3er y 4to lugar: no se encontró partido de "tercer_puesto" finalizado');
    }

    // 5°–8° — pendiente definición (open question)
    skipped.push('5°–8° lugar: derivación pendiente de definición de reglas del organizador');

    if (entries.length === 0) {
        return NextResponse.json({
            error: 'No se pudieron derivar posiciones.',
            skipped,
        }, { status: 422 });
    }

    // ── UPSERT results ────────────────────────────────────────────────────────
    const { data: upserted, error: upsertError } = await supabase
        .from('clasificacion_disciplina')
        .upsert(entries, {
            onConflict: 'disciplina_id,carrera_id,genero,categoria',
            ignoreDuplicates: false,
        })
        .select('posicion, carrera_id, puntos_obtenidos');

    if (upsertError) {
        return NextResponse.json({
            error: 'Error al guardar posiciones',
            detail: upsertError.message
        }, { status: 500 });
    }

    // ── Fetch carrera names for readable response ─────────────────────────────
    const carreraIds = entries.map(e => e.carrera_id);
    const { data: carreras } = await supabase
        .from('carreras')
        .select('id, nombre')
        .in('id', carreraIds);

    const carreraMap = Object.fromEntries((carreras ?? []).map(c => [c.id, c.nombre]));

    const calculated = entries.map(e => ({
        posicion: e.posicion,
        carrera: carreraMap[e.carrera_id] ?? `Carrera #${e.carrera_id}`,
        puntos: e.puntos_obtenidos,
    }));

    return NextResponse.json({
        message: `${entries.length} posiciones calculadas exitosamente`,
        disciplina: disciplina.name,
        genero,
        categoria: categoriaValue,
        calculated,
        skipped,
    });
}
