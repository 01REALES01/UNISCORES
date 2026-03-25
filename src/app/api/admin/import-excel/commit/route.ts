import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
    const supabase = await createRouteSupabase();

    // Auth check
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

    const body = await request.json().catch(() => ({}));
    const { import_id } = body as { import_id?: string };
    if (!import_id) {
        return NextResponse.json({ error: 'import_id requerido' }, { status: 400 });
    }

    // Load import record and check status (idempotency guard)
    const { data: importRecord } = await supabase
        .from('excel_imports')
        .select('id, status, filename')
        .eq('id', import_id)
        .single();

    if (!importRecord) {
        return NextResponse.json({ error: 'Import no encontrado' }, { status: 404 });
    }
    if (importRecord.status === 'committed') {
        return NextResponse.json({ error: 'Este import ya fue confirmado' }, { status: 409 });
    }
    if (importRecord.status === 'committing') {
        return NextResponse.json({ error: 'Este import ya está siendo procesado' }, { status: 409 });
    }

    // Lock to prevent double-commit
    await supabase
        .from('excel_imports')
        .update({ status: 'committing' })
        .eq('id', import_id);

    // Load rows to commit (skip errors)
    const { data: allRows } = await supabase
        .from('excel_import_rows')
        .select('*')
        .eq('import_id', import_id)
        .eq('committed', false)
        .neq('validation_status', 'error');

    const rows = allRows ?? [];
    const partidoRows = rows.filter(r => r.row_type === 'partido');
    const eventoRows = rows.filter(r => r.row_type === 'evento');
    const rosterRows = rows.filter(r => r.row_type === 'roster');

    // Map: (disciplina_id|fecha_date) → partido_id (built as we insert)
    const partidoKeyToId = new Map<string, number>();

    let committedPartidos = 0;
    let committedEventos = 0;
    let committedRoster = 0;

    // ── STEP 1: Partidos ──────────────────────────────────────────────────────
    for (const row of partidoRows) {
        const m = row.matched_data as Record<string, any>;
        const disciplinaId = m.disciplina_id;
        const fecha = m.fecha;

        if (!disciplinaId || !fecha) {
            continue; // Can't insert without these
        }

        const equipoA = m.equipo_a ?? 'Por definir';
        const equipoB = m.equipo_b ?? 'Por definir';
        const carreraAId = m.carrera_a_id ?? null;
        const carreraBId = m.carrera_b_id ?? null;

        // Check if partido already exists
        let query = supabase
            .from('partidos')
            .select('id, marcador_detalle, estado')
            .eq('disciplina_id', disciplinaId);

        if (carreraAId && carreraBId) {
            query = query.eq('carrera_a_id', carreraAId).eq('carrera_b_id', carreraBId);
        } else {
            // Match by equipo names if no carrera IDs
            query = query.eq('equipo_a', equipoA).eq('equipo_b', equipoB);
        }

        const fechaDate = fecha.substring(0, 10);
        const { data: existing } = await query
            .gte('fecha', `${fechaDate}T00:00:00`)
            .lte('fecha', `${fechaDate}T23:59:59`)
            .maybeSingle();

        let partidoId: number;

        if (existing) {
            // Update score if provided and match is finished
            if (m.marcador_a != null && m.marcador_b != null) {
                await supabase
                    .from('partidos')
                    .update({ estado: 'finalizado' })
                    .eq('id', existing.id);
            }
            partidoId = existing.id;
        } else {
            // Insert new partido
            const insertData: Record<string, unknown> = {
                disciplina_id: disciplinaId,
                equipo_a: equipoA,
                equipo_b: equipoB,
                carrera_a_id: carreraAId,
                carrera_b_id: carreraBId,
                fecha: fecha,
                estado: 'programado',
            };
            if (m.fase) insertData.fase = m.fase;
            if (m.lugar) insertData.lugar = m.lugar;
            if (m.genero) insertData.genero = m.genero;
            if (m.grupo) insertData.grupo = m.grupo;

            const { data: inserted, error: insertError } = await supabase
                .from('partidos')
                .insert(insertData)
                .select('id')
                .single();

            if (insertError || !inserted) {
                console.error('[commit] partido insert error:', insertError?.message);
                continue;
            }
            partidoId = inserted.id;
            committedPartidos++;
        }

        // Register for event/roster lookup
        const key = `${disciplinaId}|${fechaDate}`;
        partidoKeyToId.set(key, partidoId);

        // Mark row committed
        await supabase
            .from('excel_import_rows')
            .update({ committed: true, committed_entity_id: String(partidoId) })
            .eq('id', row.id);
    }

    // ── STEP 2: Eventos ───────────────────────────────────────────────────────
    for (const row of eventoRows) {
        const m = row.matched_data as Record<string, any>;
        let partidoId = m.partido_id as number | null;

        // Try to resolve from our newly inserted partidos
        if (!partidoId && m.disciplina_id && m.fecha) {
            const key = `${m.disciplina_id}|${String(m.fecha).substring(0, 10)}`;
            partidoId = partidoKeyToId.get(key) ?? null;
        }

        if (!partidoId) continue;

        const { data: inserted, error: eventoError } = await supabase
            .from('olympics_eventos')
            .insert({
                partido_id: partidoId,
                tipo_evento: m.tipo_evento ?? 'sistema',
                minuto: m.minuto ?? 0,
                equipo: m.equipo ?? 'sistema',
                jugador_id: m.jugador_id ?? null,
                descripcion: m.descripcion ?? null,
            })
            .select('id')
            .single();

        if (eventoError || !inserted) {
            console.error('[commit] evento insert error:', eventoError?.message);
            continue;
        }

        committedEventos++;
        await supabase
            .from('excel_import_rows')
            .update({ committed: true, committed_entity_id: String(inserted.id) })
            .eq('id', row.id);
    }

    // ── STEP 3: Roster ────────────────────────────────────────────────────────
    for (const row of rosterRows) {
        const m = row.matched_data as Record<string, any>;
        let partidoId = m.partido_id as number | null;

        if (!partidoId && m.disciplina_id && m.fecha) {
            const key = `${m.disciplina_id}|${String(m.fecha).substring(0, 10)}`;
            partidoId = partidoKeyToId.get(key) ?? null;
        }

        if (!partidoId) continue;

        let jugadorId = m.jugador_id as number | null;

        // Create player if new
        if (!jugadorId && m.create_jugador && m.nombre) {
            const { data: newJugador } = await supabase
                .from('jugadores')
                .insert({ nombre: m.nombre, numero: m.numero ?? null })
                .select('id')
                .single();
            if (newJugador) jugadorId = newJugador.id;
        }

        if (!jugadorId) continue;

        await supabase
            .from('roster_partido')
            .upsert(
                { partido_id: partidoId, jugador_id: jugadorId, equipo_a_or_b: m.equipo_a_or_b ?? 'equipo_a' },
                { onConflict: 'partido_id,jugador_id' }
            );

        committedRoster++;
        await supabase
            .from('excel_import_rows')
            .update({ committed: true, committed_entity_id: `${partidoId}:${jugadorId}` })
            .eq('id', row.id);
    }

    // ── Finalize import ───────────────────────────────────────────────────────
    await supabase
        .from('excel_imports')
        .update({ status: 'committed', commit_at: new Date().toISOString() })
        .eq('id', import_id);

    // Audit log
    await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: profile?.full_name ?? '',
        admin_email: '',
        action_type: 'IMPORT_EXCEL',
        entity_type: 'config',
        entity_id: import_id,
        details: {
            filename: importRecord.filename,
            committed_partidos: committedPartidos,
            committed_eventos: committedEventos,
            committed_roster: committedRoster,
        },
    }).then(() => {});

    return NextResponse.json({
        success: true,
        committed_partidos: committedPartidos,
        committed_eventos: committedEventos,
        committed_roster: committedRoster,
    });
}
