import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

/**
 * POST /api/admin/sync-carrera-ids
 *
 * Performs a full backfill + sync of carrera_a_ids / carrera_b_ids
 * on the partidos table. This is the programmatic equivalent of the
 * 20260411_fix_career_wins_system.sql migration, callable from the UI.
 *
 * It runs three passes:
 *   1. Seed arrays from singular carrera_a_id / carrera_b_id (legacy rows)
 *   2. Upgrade arrays from delegaciones.carrera_ids (fusion teams)
 *   3. Returns a detailed report of changes made
 *
 * Requires: admin or data_entry role.
 * Uses the Service Role key to bypass RLS on UPDATE operations.
 */
export async function POST() {
    // ── Auth check (anon client, reads session) ─────────────────────────────
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

    // ── Service Role client (bypasses RLS for bulk UPDATE) ──────────────────
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceKey) {
        return NextResponse.json({
            error: 'SUPABASE_SERVICE_ROLE_KEY no configurado en el entorno del servidor.'
        }, { status: 500 });
    }

    const admin = createClient(url, serviceKey);

    // ── Step 1: Fetch all partidos (finished + in progress) with their data ──
    const { data: partidos, error: fetchErr } = await admin
        .from('partidos')
        .select(`
            id, estado,
            carrera_a_id, carrera_b_id,
            carrera_a_ids, carrera_b_ids,
            delegacion_a_id, delegacion_b_id
        `);

    if (fetchErr || !partidos) {
        return NextResponse.json({ error: `Error al leer partidos: ${fetchErr?.message}` }, { status: 500 });
    }

    // ── Step 2: Fetch all delegaciones for quick lookup ──────────────────────
    const { data: delegaciones, error: dErr } = await admin
        .from('delegaciones')
        .select('id, carrera_ids');

    if (dErr) {
        return NextResponse.json({ error: `Error al leer delegaciones: ${dErr.message}` }, { status: 500 });
    }

    const delegMap = new Map<number, number[]>(
        (delegaciones ?? []).map(d => [d.id, d.carrera_ids ?? []])
    );

    // ── Step 3: Compute the needed updates ───────────────────────────────────

    let pass1Count = 0; // fixed from singular FK
    let pass2Count = 0; // upgraded from delegacion carrera_ids

    const updates: { id: string; carrera_a_ids?: number[]; carrera_b_ids?: number[] }[] = [];

    for (const p of partidos) {
        let newA: number[] = p.carrera_a_ids ?? [];
        let newB: number[] = p.carrera_b_ids ?? [];
        let changed = false;

        // Pass 1 — seed from singular FK if arrays are empty
        if (newA.length === 0 && p.carrera_a_id) {
            newA = [p.carrera_a_id];
            pass1Count++;
            changed = true;
        }
        if (newB.length === 0 && p.carrera_b_id) {
            newB = [p.carrera_b_id];
            pass1Count++;
            changed = true;
        }

        // Pass 2 — upgrade from delegacion (richer, includes fusions)
        if (p.delegacion_a_id) {
            const delegIdsA = delegMap.get(p.delegacion_a_id) ?? [];
            if (delegIdsA.length > newA.length) {
                newA = delegIdsA;
                pass2Count++;
                changed = true;
            }
        }
        if (p.delegacion_b_id) {
            const delegIdsB = delegMap.get(p.delegacion_b_id) ?? [];
            if (delegIdsB.length > newB.length) {
                newB = delegIdsB;
                pass2Count++;
                changed = true;
            }
        }

        if (changed) {
            updates.push({ id: p.id, carrera_a_ids: newA, carrera_b_ids: newB });
        }
    }

    // ── Step 4: Apply updates in batches of 50 ───────────────────────────────
    let successCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < updates.length; i += 50) {
        const batch = updates.slice(i, i + 50);
        await Promise.all(batch.map(async (u) => {
            const { error: upErr } = await admin
                .from('partidos')
                .update({ carrera_a_ids: u.carrera_a_ids, carrera_b_ids: u.carrera_b_ids })
                .eq('id', u.id);
            if (upErr) {
                errors.push(`Partido ${u.id}: ${upErr.message}`);
            } else {
                successCount++;
            }
        }));
    }

    // ── Step 5: Post-sync verification ───────────────────────────────────────
    const { data: summary } = await admin
        .from('partidos')
        .select('id, estado, carrera_a_ids, carrera_b_ids')
        .eq('estado', 'finalizado');

    const finished = summary ?? [];
    const withArrays = finished.filter(
        p => (p.carrera_a_ids?.length ?? 0) > 0 || (p.carrera_b_ids?.length ?? 0) > 0
    );
    const missing = finished.filter(
        p => (p.carrera_a_ids?.length ?? 0) === 0 && (p.carrera_b_ids?.length ?? 0) === 0
    );

    return NextResponse.json({
        success: true,
        message: `Sincronización completada: ${successCount} partidos actualizados.`,
        stats: {
            total_partidos: partidos.length,
            updated: successCount,
            pass1_from_singular_fk: pass1Count,
            pass2_from_delegacion: pass2Count,
            finished_with_arrays: withArrays.length,
            finished_missing_arrays: missing.length,
            missing_partido_ids: missing.slice(0, 10).map(p => p.id), // sample
        },
        errors: errors.length > 0 ? errors.slice(0, 10) : undefined,
    });
}

/**
 * GET /api/admin/sync-carrera-ids
 * Diagnostic: returns coverage stats without making any changes.
 */
export async function GET() {
    const supabase = await createRouteSupabase();
    const { data: { user }, error: authErr } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single();
    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Permisos insuficientes' }, { status: 403 });
    }

    const { data: finished } = await supabase
        .from('partidos')
        .select('id, carrera_a_ids, carrera_b_ids')
        .eq('estado', 'finalizado');

    const total = (finished ?? []).length;
    const withArrays = (finished ?? []).filter(
        p => (p.carrera_a_ids?.length ?? 0) > 0 || (p.carrera_b_ids?.length ?? 0) > 0
    ).length;

    return NextResponse.json({
        total_finished: total,
        with_arrays: withArrays,
        coverage_pct: total > 0 ? Math.round((withArrays / total) * 100) : 100,
        missing: total - withArrays,
    });
}
