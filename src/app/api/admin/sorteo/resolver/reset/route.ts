import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { getBracketConfig } from '@/lib/bracket-config';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/sorteo/resolver/reset
// Resets elimination match placeholders so the resolver can run again cleanly.
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const supabase = await createRouteSupabase();

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
        return NextResponse.json({ error: 'Solo admins pueden resetear brackets' }, { status: 403 });
    }

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

    const { data: disciplina } = await supabase
        .from('disciplinas')
        .select('name')
        .eq('id', disciplina_id)
        .single();

    if (!disciplina) {
        return NextResponse.json({ error: 'Disciplina no encontrada' }, { status: 404 });
    }

    const config = getBracketConfig(disciplina.name, genero);
    if (!config) {
        return NextResponse.json({
            error: `No hay configuración de bracket para ${disciplina.name} ${genero}`,
        }, { status: 400 });
    }

    const { data: elimMatches } = await supabase
        .from('partidos')
        .select('id, bracket_order')
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
        .eq('fase', config.eliminatoryPhase)
        .order('bracket_order', { ascending: true });

    if (!elimMatches || elimMatches.length === 0) {
        return NextResponse.json({
            error: `No hay partidos de ${config.eliminatoryPhase} para resetear`,
        }, { status: 400 });
    }

    // Build placeholder pairs depending on bracket type
    const placeholders: Array<{ equipo_a: string; equipo_b: string }> = [];

    if (config.type === 'direct_cross') {
        // [0]: 1ro.A vs 2do.B   [1]: 1ro.B vs 2do.A
        const [g0, g1] = config.groups;
        placeholders.push(
            { equipo_a: `1ro. GRUPO ${g0}`, equipo_b: `2do. GRUPO ${g1}` },
            { equipo_a: `1ro. GRUPO ${g1}`, equipo_b: `2do. GRUPO ${g0}` },
        );
    } else if (config.type === 'unified_table') {
        // Standard seeding: 1v(N), 2v(N-1), …
        const n = config.totalQualified;
        for (let i = 1; i <= n / 2; i++) {
            const suffix = (pos: number) => {
                if (pos === 1) return '1ro.';
                if (pos === 2) return '2do.';
                if (pos === 3) return '3ro.';
                return `${pos}to.`;
            };
            placeholders.push({
                equipo_a: `${suffix(i)} TABLA`,
                equipo_b: `${suffix(n + 1 - i)} TABLA`,
            });
        }
    } else if (config.type === 'single_group_final') {
        placeholders.push({
            equipo_a: `1ro. GRUPO ${config.groups[0]}`,
            equipo_b: `2do. GRUPO ${config.groups[0]}`,
        });
    }

    const resetResults: { match_id: number; equipo_a: string; equipo_b: string }[] = [];

    for (let i = 0; i < elimMatches.length; i++) {
        const ph = placeholders[i];
        if (!ph) continue;

        await supabase
            .from('partidos')
            .update({
                equipo_a: ph.equipo_a,
                equipo_b: ph.equipo_b,
                delegacion_a: null,
                delegacion_b: null,
                delegacion_a_id: null,
                delegacion_b_id: null,
                carrera_a_ids: [],
                carrera_b_ids: [],
            })
            .eq('id', elimMatches[i].id);

        resetResults.push({ match_id: elimMatches[i].id, ...ph });
    }

    await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: profile?.full_name ?? '',
        admin_email: user.email ?? '',
        action_type: 'BRACKET_RESET',
        entity_type: 'config',
        entity_id: `${disciplina_id}|${genero}`,
        details: {
            disciplina: disciplina.name,
            genero,
            bracket_type: config.type,
            reset_matches: resetResults,
        },
    }).then(() => {});

    return NextResponse.json({
        success: true,
        bracket_type: config.type,
        reset_matches: resetResults,
    });
}
