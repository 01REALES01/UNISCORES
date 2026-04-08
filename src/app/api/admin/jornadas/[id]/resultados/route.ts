import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

interface ResultadoInput {
    jugador_id?: number | null;
    carrera_id: number;
    posicion: number;
    puntos_olimpicos?: number | null;
    notas?: string;
}

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const supabase = await createRouteSupabase();
    const { id } = await params;
    const jornadaId = parseInt(id);

    if (isNaN(jornadaId)) {
        return NextResponse.json({ error: 'ID de jornada inválido' }, { status: 400 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('id, full_name, roles')
        .eq('id', user.id)
        .single();

    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    let body: { resultados: ResultadoInput[]; finalizar?: boolean };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
    }

    const { resultados, finalizar = false } = body;

    if (!Array.isArray(resultados) || resultados.length === 0) {
        return NextResponse.json({ error: 'Se requiere al menos un resultado' }, { status: 400 });
    }

    // Validate: no duplicate positions
    const positions = resultados.map(r => r.posicion);
    if (new Set(positions).size !== positions.length) {
        return NextResponse.json({ error: 'Hay posiciones duplicadas' }, { status: 400 });
    }

    // Validate: all required fields present
    for (const r of resultados) {
        if (!r.carrera_id || !r.posicion) {
            return NextResponse.json({ error: 'carrera_id y posicion son requeridos' }, { status: 400 });
        }
    }

    // ── Fetch jornada ─────────────────────────────────────────────────────────
    const { data: jornada, error: jornadaError } = await supabase
        .from('jornadas')
        .select('id, disciplina_id, genero, estado, nombre, numero')
        .eq('id', jornadaId)
        .single();

    if (jornadaError || !jornada) {
        return NextResponse.json({ error: 'Jornada no encontrada' }, { status: 404 });
    }

    // ── Upsert resultados ─────────────────────────────────────────────────────
    const rows = resultados.map(r => ({
        jornada_id:       jornadaId,
        jugador_id:       r.jugador_id ?? null,
        carrera_id:       r.carrera_id,
        posicion:         r.posicion,
        puntos_olimpicos: r.puntos_olimpicos ?? null,
        notas:            r.notas ?? null,
    }));

    // Delete existing results for this jornada and re-insert (cleaner than partial upsert)
    await supabase.from('jornada_resultados').delete().eq('jornada_id', jornadaId);

    const { error: insertError } = await supabase.from('jornada_resultados').insert(rows);
    if (insertError) {
        return NextResponse.json({ error: `Error al guardar resultados: ${insertError.message}` }, { status: 500 });
    }

    // ── Finalizar: sync puntos olímpicos → clasificacion_disciplina ───────────
    if (finalizar) {
        // Update jornada estado
        const { error: estadoError } = await supabase
            .from('jornadas')
            .update({ estado: 'finalizado' })
            .eq('id', jornadaId);

        if (estadoError) {
            return NextResponse.json({ error: `Error al finalizar jornada: ${estadoError.message}` }, { status: 500 });
        }

        // Build best position per carrera (multiple players from same program → take lowest pos)
        const bestByCarrera = new Map<number, { posicion: number; puntos: number | null }>();
        for (const r of resultados) {
            const existing = bestByCarrera.get(r.carrera_id);
            if (!existing || r.posicion < existing.posicion) {
                bestByCarrera.set(r.carrera_id, {
                    posicion: r.posicion,
                    puntos:   r.puntos_olimpicos ?? null,
                });
            }
        }

        // Sync to clasificacion_disciplina
        for (const [carreraId, best] of bestByCarrera) {
            // Determine points: use explicit override, or look up from puntos_config if available
            let puntosObtenidos = best.puntos;

            if (puntosObtenidos === null) {
                // Try to look up from puntos_olimpicos config table (if it exists)
                const { data: config } = await supabase
                    .from('puntos_olimpicos')
                    .select('puntos')
                    .eq('posicion', best.posicion)
                    .maybeSingle();
                puntosObtenidos = config?.puntos ?? 0;
            }

            await supabase.from('clasificacion_disciplina').upsert(
                {
                    disciplina_id:    jornada.disciplina_id,
                    carrera_id:       carreraId,
                    genero:           jornada.genero,
                    categoria:        null,
                    posicion:         best.posicion,
                    puntos_obtenidos: puntosObtenidos,
                },
                { onConflict: 'disciplina_id,carrera_id,genero,categoria' }
            );
        }
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await supabase.from('admin_audit_logs').insert({
        admin_id:    user.id,
        admin_name:  profile?.full_name ?? '',
        admin_email: '',
        action_type: finalizar ? 'JORNADA_FINALIZADA' : 'JORNADA_RESULTADOS_GUARDADOS',
        entity_type: 'jornada',
        entity_id:   String(jornadaId),
        details: {
            jornada_id:         jornadaId,
            jornada_nombre:     jornada.nombre,
            resultados_count:   resultados.length,
            finalizado:         finalizar,
        },
    }).then(() => {});

    return NextResponse.json({
        success:           true,
        resultados_count:  resultados.length,
        finalizado:        finalizar,
    });
}
