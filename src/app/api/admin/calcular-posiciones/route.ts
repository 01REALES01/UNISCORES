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

/** Extract winner (carrera_a_id or carrera_b_id) from a finished match */
function getWinner(match: {
    carrera_a_id: number | null;
    carrera_b_id: number | null;
    marcador_detalle: Record<string, unknown> | null;
}): { winner: number | null; loser: number | null } {
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

    if (scoreA > scoreB) return { winner: match.carrera_a_id, loser: match.carrera_b_id };
    if (scoreB > scoreA) return { winner: match.carrera_b_id, loser: match.carrera_a_id };
    return { winner: null, loser: null }; // draw — shouldn't happen in finals
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
        .select('id, fase, estado, carrera_a_id, carrera_b_id, marcador_detalle, equipo_a, equipo_b')
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

    if (finalMatch) {
        const { winner, loser } = getWinner(finalMatch);

        if (winner) {
            entries.push({
                disciplina_id: disciplinaId,
                carrera_id: winner,
                genero,
                categoria: categoriaValue,
                posicion: 1,
                puntos_obtenidos: puntosMap[1] ?? 0,
                notas: `Auto-calculado desde partido final (id: ${finalMatch.id})`,
                created_by: user.id,
            });
        } else {
            skipped.push('1er lugar: empate en el partido final, no se pudo determinar');
        }

        if (loser) {
            entries.push({
                disciplina_id: disciplinaId,
                carrera_id: loser,
                genero,
                categoria: categoriaValue,
                posicion: 2,
                puntos_obtenidos: puntosMap[2] ?? 0,
                notas: `Auto-calculado desde partido final (id: ${finalMatch.id})`,
                created_by: user.id,
            });
        }
    } else {
        skipped.push('1er y 2do lugar: no se encontró partido de "final" finalizado');
    }

    if (tercerMatch) {
        const { winner, loser } = getWinner(tercerMatch);

        if (winner) {
            entries.push({
                disciplina_id: disciplinaId,
                carrera_id: winner,
                genero,
                categoria: categoriaValue,
                posicion: 3,
                puntos_obtenidos: puntosMap[3] ?? 0,
                notas: `Auto-calculado desde partido tercer puesto (id: ${tercerMatch.id})`,
                created_by: user.id,
            });
        }

        if (loser) {
            entries.push({
                disciplina_id: disciplinaId,
                carrera_id: loser,
                genero,
                categoria: categoriaValue,
                posicion: 4,
                puntos_obtenidos: puntosMap[4] ?? 0,
                notas: `Auto-calculado desde partido tercer puesto (id: ${tercerMatch.id})`,
                created_by: user.id,
            });
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
