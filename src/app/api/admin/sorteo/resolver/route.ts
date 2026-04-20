import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { getBracketConfig } from '@/lib/bracket-config';
import { calculateStandings, compareStandings, type TeamStanding } from '@/modules/matches/utils/standings';

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/sorteo/resolver
// Automatically resolves eliminatory bracket based on group standings
// ─────────────────────────────────────────────────────────────────────────────

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
        return NextResponse.json({ error: 'Solo admins pueden resolver brackets' }, { status: 403 });
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

    // Get sport name for bracket config lookup
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

    // Fetch all group matches (must all be finalizado)
    const { data: groupMatches } = await supabase
        .from('partidos')
        .select('id, equipo_a, equipo_b, delegacion_a, delegacion_b, delegacion_a_id, delegacion_b_id, carrera_a_ids, carrera_b_ids, estado, grupo, marcador_detalle, genero')
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
        .eq('fase', 'grupos');

    if (!groupMatches || groupMatches.length === 0) {
        return NextResponse.json({ error: 'No hay partidos de grupo para esta disciplina' }, { status: 400 });
    }

    const unfinished = groupMatches.filter(m => m.estado !== 'finalizado');
    if (unfinished.length > 0) {
        return NextResponse.json({
            error: `Hay ${unfinished.length} partido(s) de grupo sin finalizar`,
            unfinished_count: unfinished.length,
        }, { status: 400 });
    }

    // Fetch fair play data for tiebreakers
    const matchIds = groupMatches.map(m => m.id);
    const { data: fairPlayEvents } = await supabase
        .from('olympics_eventos')
        .select('tipo_evento, equipo')
        .in('partido_id', matchIds)
        .in('tipo_evento', ['tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento', 'falta_tecnica', 'falta_antideportiva']);

    const fairPlayData: Record<string, number> = {};
    // Initialize all teams with base 2000
    groupMatches.forEach(m => {
        const tA = m.delegacion_a || m.equipo_a;
        const tB = m.delegacion_b || m.equipo_b;
        if (tA && !fairPlayData[tA]) fairPlayData[tA] = 2000;
        if (tB && !fairPlayData[tB]) fairPlayData[tB] = 2000;
    });
    (fairPlayEvents || []).forEach(e => {
        const team = e.equipo;
        if (!team || !fairPlayData[team]) return;
        if (e.tipo_evento === 'tarjeta_amarilla') fairPlayData[team] -= 50;
        if (e.tipo_evento === 'tarjeta_roja') fairPlayData[team] -= 100;
        if (e.tipo_evento === 'expulsion_delegado') fairPlayData[team] -= 100;
        if (e.tipo_evento === 'mal_comportamiento') fairPlayData[team] -= 100;
        if (e.tipo_evento === 'falta_tecnica') fairPlayData[team] -= 50;
        if (e.tipo_evento === 'falta_antideportiva') fairPlayData[team] -= 100;
    });

    // Compute standings per group
    const standingsByGroup: Record<string, TeamStanding[]> = {};
    for (const grupo of config.groups) {
        const gMatches = groupMatches.filter(m => m.grupo === grupo);
        // Add disciplinas mock for calculateStandings (it doesn't use it, but matches need it for score extraction)
        const enriched = gMatches.map(m => ({ ...m, disciplinas: { name: disciplina.name } }));
        standingsByGroup[grupo] = calculateStandings(enriched, disciplina.name, fairPlayData);
    }

    // Build qualified teams list based on bracket type
    let qualifiedTeams: TeamStanding[] = [];

    if (config.type === 'unified_table') {
        // Collect top N from each group
        const topTeams: TeamStanding[] = [];
        for (const grupo of config.groups) {
            const standings = standingsByGroup[grupo] || [];
            topTeams.push(...standings.slice(0, config.qualifyPerGroup));
        }

        // Add best thirds if needed
        if (config.bestThirds && config.bestThirds > 0) {
            const thirds: TeamStanding[] = [];
            for (const grupo of config.groups) {
                const standings = standingsByGroup[grupo] || [];
                if (standings.length >= 3) {
                    thirds.push(standings[2]);
                }
            }
            thirds.sort((a, b) => compareStandings(a, b, disciplina.name));
            topTeams.push(...thirds.slice(0, config.bestThirds));
        }

        // Sort all qualified teams into unified table
        qualifiedTeams = topTeams.sort((a, b) => compareStandings(a, b, disciplina.name));

    } else if (config.type === 'direct_cross') {
        // 1A, 2A, 1B, 2B — structured, not unified
        for (const grupo of config.groups) {
            const standings = standingsByGroup[grupo] || [];
            qualifiedTeams.push(...standings.slice(0, config.qualifyPerGroup));
        }

    } else if (config.type === 'single_group_final') {
        const standings = standingsByGroup[config.groups[0]] || [];
        qualifiedTeams = standings.slice(0, config.qualifyPerGroup);
    }

    // Build a lookup: team name → delegacion info from group matches
    const teamToDelegacion = new Map<string, { id: number; carrera_ids: number[] }>();
    for (const m of groupMatches) {
        if (m.delegacion_a && m.delegacion_a_id) {
            teamToDelegacion.set(m.delegacion_a, {
                id: m.delegacion_a_id,
                carrera_ids: m.carrera_a_ids || [],
            });
        }
        if (m.delegacion_b && m.delegacion_b_id) {
            teamToDelegacion.set(m.delegacion_b, {
                id: m.delegacion_b_id,
                carrera_ids: m.carrera_b_ids || [],
            });
        }
    }

    // Fetch eliminatory matches to fill
    const { data: elimMatches } = await supabase
        .from('partidos')
        .select('id, equipo_a, equipo_b, fase, bracket_order')
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
        .eq('fase', config.eliminatoryPhase)
        .order('bracket_order', { ascending: true });

    if (!elimMatches || elimMatches.length === 0) {
        return NextResponse.json({
            error: `No hay partidos de ${config.eliminatoryPhase} para asignar`,
        }, { status: 400 });
    }

    // Helper to update a match with resolved teams
    async function assignMatch(
        matchId: number,
        teamA: TeamStanding,
        teamB: TeamStanding,
    ) {
        const delA = teamToDelegacion.get(teamA.team);
        const delB = teamToDelegacion.get(teamB.team);

        await supabase
            .from('partidos')
            .update({
                equipo_a: teamA.team,
                equipo_b: teamB.team,
                delegacion_a: teamA.team,
                delegacion_b: teamB.team,
                delegacion_a_id: delA?.id ?? null,
                delegacion_b_id: delB?.id ?? null,
                carrera_a_ids: delA?.carrera_ids ?? [],
                carrera_b_ids: delB?.carrera_ids ?? [],
            })
            .eq('id', matchId);
    }

    const resolvedMatches: { match_id: number; team_a: string; team_b: string }[] = [];

    if (config.type === 'unified_table') {
        // Seeding: 1st vs last, 2nd vs second-to-last, etc.
        const n = config.totalQualified;
        for (let i = 0; i < Math.min(elimMatches.length, n / 2); i++) {
            const teamA = qualifiedTeams[i];
            const teamB = qualifiedTeams[n - 1 - i];
            if (!teamA || !teamB) continue;

            await assignMatch(elimMatches[i].id, teamA, teamB);
            resolvedMatches.push({
                match_id: elimMatches[i].id,
                team_a: teamA.team,
                team_b: teamB.team,
            });
        }

    } else if (config.type === 'direct_cross') {
        // 1A vs 2B (match 0), 1B vs 2A (match 1)
        const standingsA = standingsByGroup['A'] || [];
        const standingsB = standingsByGroup['B'] || [];

        const crosses: [TeamStanding, TeamStanding][] = [
            [standingsA[0], standingsB[1]], // 1A vs 2B
            [standingsB[0], standingsA[1]], // 1B vs 2A
        ];

        for (let i = 0; i < Math.min(elimMatches.length, crosses.length); i++) {
            const [teamA, teamB] = crosses[i];
            if (!teamA || !teamB) continue;

            await assignMatch(elimMatches[i].id, teamA, teamB);
            resolvedMatches.push({
                match_id: elimMatches[i].id,
                team_a: teamA.team,
                team_b: teamB.team,
            });
        }

    } else if (config.type === 'single_group_final') {
        // Top 2 → final
        if (qualifiedTeams.length >= 2 && elimMatches.length >= 1) {
            await assignMatch(elimMatches[0].id, qualifiedTeams[0], qualifiedTeams[1]);
            resolvedMatches.push({
                match_id: elimMatches[0].id,
                team_a: qualifiedTeams[0].team,
                team_b: qualifiedTeams[1].team,
            });
        }
    }

    // Audit log
    await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: profile?.full_name ?? '',
        admin_email: user.email ?? '',
        action_type: 'BRACKET_RESOLUTION',
        entity_type: 'config',
        entity_id: `${disciplina_id}|${genero}`,
        details: {
            disciplina: disciplina.name,
            genero,
            bracket_type: config.type,
            qualified_teams: qualifiedTeams.map(t => t.team),
            resolved_matches: resolvedMatches,
        },
    }).then(() => {});

    return NextResponse.json({
        success: true,
        bracket_type: config.type,
        qualified_teams: qualifiedTeams.map(t => ({
            team: t.team,
            points: t.points,
            won: t.won,
            lost: t.lost,
            drawn: t.drawn,
            diff: t.diff,
            grupo: t.grupo,
        })),
        resolved_matches: resolvedMatches,
    });
}
