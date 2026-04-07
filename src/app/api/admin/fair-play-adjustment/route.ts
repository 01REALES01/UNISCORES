import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

export async function POST(req: NextRequest) {
    const supabase = await createRouteSupabase();

    // Verify admin session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'staff'].includes(profile.rol)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { partido_id, equipo, valor } = body;

    if (!partido_id || !equipo || valor === undefined || valor === null) {
        return NextResponse.json({ error: 'partido_id, equipo y valor son requeridos' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('olympics_eventos')
        .insert({
            partido_id,
            equipo,
            tipo_evento: 'ajuste_fair_play',
            descripcion: String(valor),
        })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true, evento: data });
}

export async function DELETE(req: NextRequest) {
    const supabase = await createRouteSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', user.id)
        .single();

    if (!profile || !['admin', 'staff'].includes(profile.rol)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { evento_id } = body;

    if (!evento_id) {
        return NextResponse.json({ error: 'evento_id requerido' }, { status: 400 });
    }

    const { error } = await supabase
        .from('olympics_eventos')
        .delete()
        .eq('id', evento_id)
        .eq('tipo_evento', 'ajuste_fair_play');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ ok: true });
}
