import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { getBracketConfig } from '@/lib/bracket-config';
import { calculateStandings, compareStandings, teamSideLabelForStandings, type TeamStanding } from '@/modules/matches/utils/standings';
import { DI_RULES, BASELINE } from '@/modules/matches/utils/deporte-integral';

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

    // Fetch fair play data for tiebreakers (same logic as clasificacion page)
    const matchIds = groupMatches.map(m => m.id);

    // Build side → team name lookup (events store 'equipo_a'/'equipo_b', not the real name)
    const teamNameByMatchAndSide: Record<string, string> = {};
    groupMatches.forEach(m => {
        const tA = m.delegacion_a || m.equipo_a;
        const tB = m.delegacion_b || m.equipo_b;
        if (tA) teamNameByMatchAndSide[`${m.id}_equipo_a`] = tA;
        if (tB) teamNameByMatchAndSide[`${m.id}_equipo_b`] = tB;
    });

    const sportRules = DI_RULES[disciplina.name.toLowerCase()] ?? {};
    const genericDeductions: Record<string, number> = {
        tarjeta_amarilla: -50,
        tarjeta_roja: -100,
        expulsion_delegado: -100,
        mal_comportamiento: -100,
        falta_tecnica: -50,
        falta_antideportiva: -100,
    };
    const allFpTypes = [
        'tarjeta_amarilla', 'tarjeta_roja', 'expulsion_delegado', 'mal_comportamiento',
        'ajuste_fair_play', 'falta_tecnica', 'falta_antideportiva',
        'falta_tecnica_personal', 'descalificacion_directa_jugador', 'descalificacion_directa_personal',
        'sancion_adicional', 'expulsion_torneo_jugador', 'expulsion_torneo_personal',
    ];

    const { data: fairPlayEvents } = await supabase
        .from('olympics_eventos')
        .select('tipo_evento, equipo, descripcion, partido_id')
        .in('partido_id', matchIds)
        .in('tipo_evento', allFpTypes);

    const fairPlayData: Record<string, number> = {};
    groupMatches.forEach(m => {
        const tA = m.delegacion_a || m.equipo_a;
        const tB = m.delegacion_b || m.equipo_b;
        if (tA && !(tA in fairPlayData)) fairPlayData[tA] = BASELINE;
        if (tB && !(tB in fairPlayData)) fairPlayData[tB] = BASELINE;
    });
    (fairPlayEvents || []).forEach((e: any) => {
        const side = e.equipo;
        if (!side) return;
        // Resolve side ('equipo_a'/'equipo_b') to actual team name
        const team = teamNameByMatchAndSide[`${e.partido_id}_${side}`] ?? side;
        if (!(team in fairPlayData)) fairPlayData[team] = BASELINE;
        if (e.tipo_evento === 'ajuste_fair_play') {
            fairPlayData[team] += Number(e.descripcion ?? 0);
            return;
        }
        const deduction = sportRules[e.tipo_evento] ?? genericDeductions[e.tipo_evento];
        if (deduction !== undefined) fairPlayData[team] += deduction;
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

    // Mismo criterio que calculateStandings / auto-advance: clave = nombre mostrado en la tabla
    const teamToDelegacion = new Map<string, { id: number; carrera_ids: number[] }>();
    for (const m of groupMatches) {
        if (m.delegacion_a_id) {
            const v = { id: m.delegacion_a_id, carrera_ids: m.carrera_a_ids || [] };
            const la = teamSideLabelForStandings(m, 'a');
            teamToDelegacion.set(la, v);
            if (m.delegacion_a && m.delegacion_a !== la) teamToDelegacion.set(m.delegacion_a, v);
            if (m.equipo_a && m.equipo_a !== la) teamToDelegacion.set(m.equipo_a, v);
        }
        if (m.delegacion_b_id) {
            const v = { id: m.delegacion_b_id, carrera_ids: m.carrera_b_ids || [] };
            const lb = teamSideLabelForStandings(m, 'b');
            teamToDelegacion.set(lb, v);
            if (m.delegacion_b && m.delegacion_b !== lb) teamToDelegacion.set(m.delegacion_b, v);
            if (m.equipo_b && m.equipo_b !== lb) teamToDelegacion.set(m.equipo_b, v);
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

    // Parse a placeholder like "1ro. GRUPO A" → TeamStanding for 1st place of Group A
    const parseSlot = (slot: string): TeamStanding | undefined => {
        const upper = slot.toUpperCase();
        const posMatch = upper.match(/^(\d+)/);
        const grupoMatch = upper.match(/GRUPO\s*([A-Z])/);
        if (!posMatch || !grupoMatch) return undefined;
        const pos = parseInt(posMatch[1], 10) - 1;
        const grupo = grupoMatch[1];
        return (standingsByGroup[grupo] || [])[pos];
    };

    // Shared resolution: read placeholder from each bracket match to assign the
    // correct teams to the correct llave/time slot as defined in the Excel fixture.
    const resolveByPlaceholder = async () => {
        for (const match of elimMatches) {
            const teamA = parseSlot(match.equipo_a || '');
            const teamB = parseSlot(match.equipo_b || '');
            if (!teamA || !teamB) continue;

            await assignMatch(match.id, teamA, teamB);
            resolvedMatches.push({
                match_id: match.id,
                team_a: teamA.team,
                team_b: teamB.team,
            });
        }
    };

    if (config.type === 'unified_table') {
        await resolveByPlaceholder();

    } else if (config.type === 'direct_cross') {
        if (qualifiedTeams.length < 4) {
            return NextResponse.json(
                {
                    error:
                        'direct_cross requiere 4 equipos clasificados (top por grupo). Revisa que cada grupo tenga al menos 2 equipos y las tablas de posiciones.',
                },
                { status: 400 }
            );
        }
        if (elimMatches.length < 2) {
            return NextResponse.json(
                {
                    error: `Se esperan al menos 2 partidos en fase ${config.eliminatoryPhase} (p. ej. 2 semis). Revisa el import del fixture.`,
                },
                { status: 400 }
            );
        }
        // 1A vs 2B, 1B vs 2A — qualifiedTeams = [1A, 2A, 1B, 2B] por orden de grupos
        const semi1a = qualifiedTeams[0];
        const semi1b = qualifiedTeams[3];
        const semi2a = qualifiedTeams[2];
        const semi2b = qualifiedTeams[1];
        if (!semi1a?.team || !semi1b?.team || !semi2a?.team || !semi2b?.team) {
            return NextResponse.json(
                { error: 'Datos de equipos clasificados incompletos; no se puede resolver el cruce.' },
                { status: 400 }
            );
        }
        await assignMatch(elimMatches[0].id, semi1a, semi1b);
        resolvedMatches.push({
            match_id: elimMatches[0].id,
            team_a: semi1a.team,
            team_b: semi1b.team,
        });
        await assignMatch(elimMatches[1].id, semi2a, semi2b);
        resolvedMatches.push({
            match_id: elimMatches[1].id,
            team_a: semi2a.team,
            team_b: semi2b.team,
        });

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
