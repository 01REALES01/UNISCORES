import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

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

        // 1. Obtener ID de la disciplina Natación
        const { data: disc } = await supabase
            .from('disciplinas')
            .select('id')
            .eq('name', 'Natación')
            .limit(1)
            .maybeSingle();

        if (!disc) return NextResponse.json({ error: 'Disciplina Natación no encontrada' }, { status: 500 });
        const disciplinaId = disc.id;

        // 2. Fetch all Swimming matches
        const { data: partidos } = await supabase
            .from('partidos')
            .select('id')
            .eq('disciplina_id', disciplinaId);

        if (!partidos || partidos.length === 0) {
            return NextResponse.json({ deleted: 0 });
        }

        const ids = partidos.map(p => p.id);

        // 3. Limpiar dependencias para evitar violaciones de foreign keys (cascade deletion fallback)
        await supabase.from('olympics_eventos').delete().in('partido_id', ids);
        await supabase.from('roster_partido').delete().in('partido_id', ids);
        await supabase.from('pronosticos').delete().in('match_id', ids);
        await supabase.from('noticias').update({ partido_id: null }).in('partido_id', ids);

        // 4. Eliminar Partidos
        const { error, count } = await supabase
            .from('partidos')
            .delete({ count: 'exact' })
            .in('id', ids);

        if (error) throw error;

        return NextResponse.json({ deleted: count || ids.length });

    } catch (err: any) {
        console.error('[delete-natacion] Error:', err);
        return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
    }
}
