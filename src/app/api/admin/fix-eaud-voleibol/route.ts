import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

/**
 * POST /api/admin/fix-eaud-voleibol
 *
 * Migrates the "Diseño Gráfico" delegación in Voleibol Masculino to "EAUD",
 * combining it with Arquitectura and Diseño Industrial as per the FUSION_MAP.
 *
 * Steps:
 *   1. Find Voleibol masculino disciplina_id
 *   2. Find the "Diseño Gráfico" delegación for that sport/gender
 *   3. Resolve IDs for Diseño Gráfico, Arquitectura, Diseño Industrial
 *   4. UPDATE delegaciones: rename to "EAUD", set carrera_ids to all 3
 *   5. UPDATE all partidos referencing that delegación (equipo_a/b, delegacion_a/b, carrera_a/b_ids)
 *
 * Requires: admin or data_entry role.
 * Uses Service Role key to bypass RLS.
 * Idempotent: safe to run multiple times.
 */
export async function POST() {
    // ── Auth check ────────────────────────────────────────────────────────────
    const supabase = await createRouteSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();

    if (authErr || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();

    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    // ── Service Role client ───────────────────────────────────────────────────
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return NextResponse.json({
            error: 'SUPABASE_SERVICE_ROLE_KEY no configurado en el entorno del servidor.'
        }, { status: 500 });
    }

    const admin = createClient(url, serviceKey);

    // ── Step 1: Find Voleibol Masculino disciplina_id ────────────────────────
    const { data: disciplinas, error: discErr } = await admin
        .from('disciplinas')
        .select('id, nombre, genero')
        .eq('nombre', 'Voleibol')
        .eq('genero', 'masculino');

    if (discErr || !disciplinas || disciplinas.length === 0) {
        return NextResponse.json({
            error: 'No se encontró disciplina Voleibol masculino'
        }, { status: 404 });
    }

    const voleibolId = disciplinas[0].id;

    // ── Step 2: Find "Diseño Gráfico" delegación ──────────────────────────────
    const { data: deleg, error: dErr } = await admin
        .from('delegaciones')
        .select('id, nombre, carrera_ids, genero')
        .eq('disciplina_id', voleibolId)
        .eq('nombre', 'Diseño Gráfico')
        .eq('genero', 'masculino')
        .single();

    if (dErr) {
        // Not an error if it doesn't exist — it might already be EAUD
        if (dErr.code === 'PGRST116') {
            return NextResponse.json({
                ok: true,
                message: 'No se encontró delegación "Diseño Gráfico" en Voleibol Masculino. Puede que ya esté convertida a EAUD.',
                action_taken: false,
            });
        }
        return NextResponse.json({ error: dErr.message }, { status: 500 });
    }

    const delegacionId = deleg.id;

    // ── Step 3: Resolve carrera IDs ────────────────────────────────────────────
    const { data: carreras, error: cErr } = await admin
        .from('carreras')
        .select('id, nombre')
        .in('nombre', ['Diseño Gráfico', 'Arquitectura', 'Diseño Industrial']);

    if (cErr) {
        return NextResponse.json({ error: cErr.message }, { status: 500 });
    }

    const carreraMap = new Map<string, number>(
        (carreras ?? []).map(c => [c.nombre, c.id])
    );

    const carreraIds = [
        carreraMap.get('Diseño Gráfico'),
        carreraMap.get('Arquitectura'),
        carreraMap.get('Diseño Industrial'),
    ];

    if (carreraIds.some(id => id === undefined)) {
        return NextResponse.json({
            error: 'No se pudieron resolver todos los IDs de carrera para EAUD',
            resolved: carreraIds.filter(id => id !== undefined).length,
            expected: 3,
        }, { status: 400 });
    }

    const resolvedCarreraIds = carreraIds as number[];

    // ── Step 4: UPDATE delegaciones ────────────────────────────────────────────
    const { error: delegErr } = await admin
        .from('delegaciones')
        .update({
            nombre: 'EAUD',
            carrera_ids: resolvedCarreraIds,
        })
        .eq('id', delegacionId);

    if (delegErr) {
        return NextResponse.json({
            error: `Error actualizando delegación: ${delegErr.message}`
        }, { status: 500 });
    }

    // ── Step 5: UPDATE partidos (team A side) ─────────────────────────────────
    const { error: partErr1 } = await admin
        .from('partidos')
        .update({
            equipo_a: 'EAUD',
            delegacion_a: 'EAUD',
            carrera_a_ids: resolvedCarreraIds,
        })
        .eq('delegacion_a_id', delegacionId);

    if (partErr1) {
        return NextResponse.json({
            error: `Error actualizando partidos (team A): ${partErr1.message}`
        }, { status: 500 });
    }

    // ── Step 6: UPDATE partidos (team B side) ─────────────────────────────────
    const { error: partErr2 } = await admin
        .from('partidos')
        .update({
            equipo_b: 'EAUD',
            delegacion_b: 'EAUD',
            carrera_b_ids: resolvedCarreraIds,
        })
        .eq('delegacion_b_id', delegacionId);

    if (partErr2) {
        return NextResponse.json({
            error: `Error actualizando partidos (team B): ${partErr2.message}`
        }, { status: 500 });
    }

    // ── Step 7: Verify changes ────────────────────────────────────────────────
    const { data: updatedDeleg } = await admin
        .from('delegaciones')
        .select('id, nombre, carrera_ids')
        .eq('id', delegacionId)
        .single();

    const { data: updatedPartidos } = await admin
        .from('partidos')
        .select('id, equipo_a, equipo_b, delegacion_a_id, delegacion_b_id')
        .or(`delegacion_a_id.eq.${delegacionId},delegacion_b_id.eq.${delegacionId}`);

    return NextResponse.json({
        ok: true,
        message: 'Conversión de Diseño Gráfico → EAUD completada en Voleibol Masculino',
        action_taken: true,
        delegacion_updated: {
            id: updatedDeleg?.id,
            nombre: updatedDeleg?.nombre,
            carrera_ids: updatedDeleg?.carrera_ids,
        },
        partidos_updated: (updatedPartidos ?? []).length,
        partidos_sample: (updatedPartidos ?? []).slice(0, 5),
    });
}
