import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { DI_MANUAL_TYPES } from '@/modules/matches/utils/deporte-integral';

async function getAuthorizedClient() {
    const supabase = await createRouteSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { supabase, user: null, authorized: false };
    const { data: profile } = await supabase.from('profiles').select('roles').eq('id', user.id).single();
    const roles: string[] = profile?.roles ?? [];
    const authorized = roles.includes('admin') || roles.includes('data_entry');
    return { supabase, user, authorized };
}

export async function POST(req: NextRequest) {
    const { supabase, authorized } = await getAuthorizedClient();
    if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { partido_id, equipo, tipo_evento, jugador_id } = body;

    if (!partido_id || !equipo || !tipo_evento) {
        return NextResponse.json({ error: 'partido_id, equipo y tipo_evento son requeridos' }, { status: 400 });
    }
    if (!DI_MANUAL_TYPES.has(tipo_evento)) {
        return NextResponse.json({ error: 'tipo_evento no permitido en este endpoint' }, { status: 400 });
    }

    const { data, error } = await supabase
        .from('olympics_eventos')
        .insert({ partido_id, equipo, tipo_evento, jugador_id: jugador_id ?? null, minuto: 0 })
        .select()
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, evento: data });
}

export async function DELETE(req: NextRequest) {
    const { supabase, authorized } = await getAuthorizedClient();
    if (!authorized) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const body = await req.json();
    const { evento_id } = body;
    if (!evento_id) return NextResponse.json({ error: 'evento_id requerido' }, { status: 400 });

    const { data: existing } = await supabase
        .from('olympics_eventos')
        .select('tipo_evento')
        .eq('id', evento_id)
        .single();

    if (!existing || !DI_MANUAL_TYPES.has(existing.tipo_evento)) {
        return NextResponse.json({ error: 'Solo se pueden eliminar eventos manuales de Deporte Integral' }, { status: 400 });
    }

    const { error } = await supabase.from('olympics_eventos').delete().eq('id', evento_id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
