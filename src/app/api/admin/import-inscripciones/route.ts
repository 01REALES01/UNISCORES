import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

/**
 * GET /api/admin/import-inscripciones
 *
 * Returns enrollment summary derived from the `delegaciones` table.
 * carrera_disciplina is a VIEW on delegaciones — no separate import needed.
 * The schedule import (/api/admin/schedule) already creates delegaciones when
 * fixtures are uploaded from the Excel.
 */
export async function GET(_req: NextRequest) {
    const supabase = await createRouteSupabase();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { data, error } = await supabase
        .from('delegaciones')
        .select('id, nombre, genero, carrera_ids, disciplinas(id, name, icon)')
        .not('disciplina_id', 'is', null)
        .not('genero', 'is', null)
        .order('disciplina_id')
        .order('genero');

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const delegaciones = data ?? [];
    const total_carreras = delegaciones.reduce(
        (sum, d) => sum + (d.carrera_ids?.length ?? 0), 0
    );
    const disciplinas_set = new Set(
        delegaciones.map((d: any) => `${(d.disciplinas as any)?.id}_${d.genero}`)
    );

    return NextResponse.json({
        summary: {
            total_delegaciones: delegaciones.length,
            total_carreras_enrolled: total_carreras,
            disciplinas_activas: disciplinas_set.size,
        },
        delegaciones: delegaciones.map((d: any) => ({
            id: d.id,
            equipo_nombre: d.nombre,
            disciplina: (d.disciplinas as any)?.name ?? '?',
            genero: d.genero,
            n_carreras: d.carrera_ids?.length ?? 0,
        })),
    });
}
