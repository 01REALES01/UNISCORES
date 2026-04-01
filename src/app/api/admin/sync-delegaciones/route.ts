import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { EQUIPO_NOMBRE_TO_CARRERAS } from '@/lib/constants';

/**
 * POST /api/admin/sync-delegaciones
 *
 * Fixes carrera_ids for combined teams (e.g., DCPRI → [Derecho, C.Política, RRII])
 * using the EQUIPO_NOMBRE_TO_CARRERAS static map.
 *
 * Run after the backfill SQL creates the delegaciones rows with only a single
 * carrera_id (or empty) from partidos.carrera_a_id. This route:
 *   1. Loads all delegaciones with empty or single carrera_ids
 *   2. For each team name in EQUIPO_NOMBRE_TO_CARRERAS:
 *      a. Looks up carrera IDs from the carreras table
 *      b. Updates delegaciones.carrera_ids if the resolved list has more IDs than current
 *   3. Returns a summary of what was updated
 */
export async function POST() {
    const supabase = await createRouteSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Load all delegaciones
    const { data: delegaciones, error: dErr } = await supabase
        .from('delegaciones')
        .select('id, nombre, carrera_ids');

    if (dErr) return NextResponse.json({ error: dErr.message }, { status: 500 });

    // Load all carreras for name→id resolution
    const { data: carreras, error: cErr } = await supabase
        .from('carreras')
        .select('id, nombre');

    if (cErr) return NextResponse.json({ error: cErr.message }, { status: 500 });

    const carreraByName = new Map<string, number>(
        (carreras ?? []).map(c => [c.nombre.trim().toLowerCase(), c.id])
    );

    const updated: { nombre: string; old_count: number; new_count: number }[] = [];
    const unresolved: { nombre: string; missing: string[] }[] = [];

    for (const deleg of delegaciones ?? []) {
        const teamKey = deleg.nombre?.trim().toUpperCase();

        // Find matching entry in the map (case-insensitive key match)
        const mapEntry = Object.entries(EQUIPO_NOMBRE_TO_CARRERAS).find(
            ([key]) => key.trim().toUpperCase() === teamKey
        );
        if (!mapEntry) continue; // Not a combined team (or single-carrera, already correct)

        const [, carreraNames] = mapEntry;

        const resolvedIds: number[] = [];
        const missing: string[] = [];

        for (const name of carreraNames) {
            const id = carreraByName.get(name.trim().toLowerCase());
            if (id !== undefined) {
                resolvedIds.push(id);
            } else {
                missing.push(name);
            }
        }

        if (missing.length > 0) {
            unresolved.push({ nombre: deleg.nombre, missing });
        }

        if (resolvedIds.length <= (deleg.carrera_ids?.length ?? 0)) continue;

        const { error: upErr } = await supabase
            .from('delegaciones')
            .update({ carrera_ids: resolvedIds })
            .eq('id', deleg.id);

        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

        updated.push({
            nombre: deleg.nombre,
            old_count: deleg.carrera_ids?.length ?? 0,
            new_count: resolvedIds.length,
        });
    }

    return NextResponse.json({
        ok: true,
        updated,
        unresolved,
        summary: `${updated.length} delegaciones actualizadas`,
    });
}
