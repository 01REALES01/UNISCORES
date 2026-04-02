import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

export async function POST(request: NextRequest) {
    const supabase = await createRouteSupabase();

    // Auth
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
    if (!roles.includes('admin')) {
        return NextResponse.json({ error: 'Solo admins pueden reiniciar el sorteo' }, { status: 403 });
    }

    // Parse body
    let body: { disciplina_id: number; genero: string };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { disciplina_id, genero } = body;
    if (!disciplina_id || !genero) {
        return NextResponse.json({ error: 'disciplina_id y genero son requeridos' }, { status: 400 });
    }

    // 1. Get all delegaciones for this sport/gender that have a slot assigned
    const { data: delegaciones, error: delErr } = await supabase
        .from('delegaciones')
        .select('id, slot_label')
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
        .not('slot_label', 'is', null);

    if (delErr) {
        return NextResponse.json({ error: `Error buscando delegaciones: ${delErr.message}` }, { status: 500 });
    }

    let matchesReset = 0;

    // 2. Iterate and revert matches
    for (const d of delegaciones || []) {
        if (!d.slot_label) continue;

        // Restore equipo_a
        const { data: updatedA } = await supabase
            .from('partidos')
            .update({
                equipo_a: d.slot_label,
                delegacion_a: null,
                delegacion_a_id: null,
                carrera_a_ids: '{}',
            })
            .eq('disciplina_id', disciplina_id)
            .eq('genero', genero)
            .eq('delegacion_a_id', d.id)
            .eq('fase', 'grupos')
            .select('id');

        // Restore equipo_b
        const { data: updatedB } = await supabase
            .from('partidos')
            .update({
                equipo_b: d.slot_label,
                delegacion_b: null,
                delegacion_b_id: null,
                carrera_b_ids: '{}',
            })
            .eq('disciplina_id', disciplina_id)
            .eq('genero', genero)
            .eq('delegacion_b_id', d.id)
            .eq('fase', 'grupos')
            .select('id');
            
        matchesReset += (updatedA?.length || 0) + (updatedB?.length || 0);
    }

    // 3. Clear slot_labels
    const { error: clearErr } = await supabase
        .from('delegaciones')
        .update({ slot_label: null })
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
        .not('slot_label', 'is', null);

    if (clearErr) {
        return NextResponse.json({ error: `Error limpiando slots: ${clearErr.message}` }, { status: 500 });
    }

    // 4. Also automatically unresolve the eliminatory bracket just in case
    // Any non-group match that has a delegacion_a_id or delegacion_b_id should be cleared
    // Actually, this is more complex because the names would be lost. We just leave them or clear assignments.
    // If they resolver the bracket, testing is fully done. A full DB re-import from CSV might be needed if they broke eliminatory.
    // We will clear eliminatory assignments but keep the placeholders if possible.
    // Eliminatory matches start with placeholders like "1ro Grupo A" in equipo_a but they might be overwritten.
    // So for safety, we only touch group stage here.

    // Audit log
    await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: profile?.full_name ?? '',
        admin_email: user.email ?? '',
        action_type: 'SORTEO_RESET',
        entity_type: 'config',
        entity_id: `${disciplina_id}|${genero}`,
        details: {
            disciplina_id,
            genero,
            matches_reset: matchesReset,
        },
    }).then(() => {});

    return NextResponse.json({
        success: true,
        matches_reset: matchesReset,
    });
}
