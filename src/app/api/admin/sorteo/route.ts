import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/sorteo?disciplina_id=X&genero=Y
// Returns slot labels, delegaciones, and group completion status
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
    const supabase = await createRouteSupabase();

    // Auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    const { data: profile } = await supabase
        .from('profiles')
        .select('roles')
        .eq('id', user.id)
        .single();
    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('data_entry')) {
        return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Params
    const { searchParams } = new URL(request.url);
    const disciplinaId = parseInt(searchParams.get('disciplina_id') || '');
    const genero = searchParams.get('genero') || '';
    if (!disciplinaId || !genero) {
        return NextResponse.json({ error: 'disciplina_id y genero son requeridos' }, { status: 400 });
    }

    // Fetch group-phase matches for this sport+gender
    const { data: rawGroupMatches, error: matchErr } = await supabase
        .from('partidos')
        .select('id, equipo_a, equipo_b, grupo, estado, delegacion_a, delegacion_b')
        .eq('disciplina_id', disciplinaId)
        .eq('genero', genero)
        .eq('fase', 'grupos');

    if (matchErr) {
        return NextResponse.json({ error: matchErr.message }, { status: 500 });
    }

    // Hotfix: Ignorar cruces de eliminación que fueron importados erróneamente con fase='grupos'
    const groupMatches = (rawGroupMatches || []).filter(m => {
        const a = String(m.equipo_a).toUpperCase();
        const b = String(m.equipo_b).toUpperCase();
        
        // Excluye si son solo números (ej. "1" o "8")
        if (/^\d+$/.test(a) || /^\d+$/.test(b)) return false;
        
        // Excluye textos de llaves eliminatorias ("GANADOR LLAVE A", "1RO GRUPO B", etc.)
        const elimKeywords = ['GANADOR', 'PERDEDOR', 'LLAVE', 'FINAL', '1RO', '2DO', '3RO', '4TO'];
        if (elimKeywords.some(kw => a.includes(kw) || b.includes(kw))) return false;
        
        return true;
    });

    // Extract unique slot labels (before sorteo, equipo_a/b hold slot codes like "1A")
    // After sorteo, equipo_a/b hold real names — we detect "assigned" by checking delegacion_a/b
    const slotMap = new Map<string, { grupo: string; assigned: string | null }>();
    for (const m of groupMatches || []) {
        if (m.equipo_a && !slotMap.has(m.equipo_a)) {
            slotMap.set(m.equipo_a, {
                grupo: m.grupo || '',
                assigned: m.delegacion_a || null,
            });
        }
        if (m.equipo_b && !slotMap.has(m.equipo_b)) {
            slotMap.set(m.equipo_b, {
                grupo: m.grupo || '',
                assigned: m.delegacion_b || null,
            });
        }
    }

    // If delegacion_a is set, the slot has already been assigned — the team name IS the slot now
    // We need to detect unassigned slots: those where equipo_a is still a short code (like "1A", "3C")
    // vs assigned slots where equipo_a is a real name.
    // Better approach: check delegaciones.slot_label to see which slots are assigned.

    // Fetch delegaciones for this sport+gender
    const { data: delegaciones } = await supabase
        .from('delegaciones')
        .select('id, nombre, carrera_ids, slot_label')
        .eq('disciplina_id', disciplinaId)
        .eq('genero', genero)
        .order('nombre');

    // Build slots from delegaciones that have slot_label set (assigned)
    // Plus remaining slots from match data that aren't yet assigned
    const assignedSlots = new Set<string>();
    for (const d of delegaciones || []) {
        if (d.slot_label) assignedSlots.add(d.slot_label);
    }

    const slots = Array.from(slotMap.entries()).map(([label, info]) => ({
        label,
        grupo: info.grupo,
        assigned_delegacion: (delegaciones || []).find(d => d.slot_label === label)?.nombre ?? null,
        assigned_delegacion_id: (delegaciones || []).find(d => d.slot_label === label)?.id ?? null,
    })).sort((a, b) => {
        if (a.grupo !== b.grupo) return a.grupo.localeCompare(b.grupo);
        return a.label.localeCompare(b.label);
    });

    // Group completion status
    const totalGroupMatches = (groupMatches || []).length;
    const finishedGroupMatches = (groupMatches || []).filter(m => m.estado === 'finalizado').length;

    // Count eliminatory matches with placeholder teams
    const { count: elimPending } = await supabase
        .from('partidos')
        .select('id', { count: 'exact', head: true })
        .eq('disciplina_id', disciplinaId)
        .eq('genero', genero)
        .neq('fase', 'grupos')
        .is('delegacion_a_id', null);

    return NextResponse.json({
        slots,
        delegaciones: (delegaciones || []).map(d => ({
            id: d.id,
            nombre: d.nombre,
            carrera_ids: d.carrera_ids,
            slot_label: d.slot_label,
        })),
        group_matches_total: totalGroupMatches,
        group_matches_finished: finishedGroupMatches,
        group_complete: totalGroupMatches > 0 && finishedGroupMatches === totalGroupMatches,
        eliminatory_pending: elimPending ?? 0,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/sorteo
// Assigns delegaciones to slot labels, cascading updates to all group matches
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
        return NextResponse.json({ error: 'Solo admins pueden ejecutar el sorteo' }, { status: 403 });
    }

    // Parse body
    let body: { disciplina_id: number; genero: string; assignments: { slot: string; delegacion_id: number }[] };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'JSON inválido' }, { status: 400 });
    }

    const { disciplina_id, genero, assignments } = body;
    if (!disciplina_id || !genero || !Array.isArray(assignments) || assignments.length === 0) {
        return NextResponse.json({ error: 'disciplina_id, genero y assignments son requeridos' }, { status: 400 });
    }

    // Validate no duplicate slots or delegaciones
    const seenSlots = new Set<string>();
    const seenDelegaciones = new Set<number>();
    for (const a of assignments) {
        if (seenSlots.has(a.slot)) {
            return NextResponse.json({ error: `Slot duplicado: "${a.slot}"` }, { status: 400 });
        }
        if (seenDelegaciones.has(a.delegacion_id)) {
            return NextResponse.json({ error: `Delegación duplicada: ${a.delegacion_id}` }, { status: 400 });
        }
        seenSlots.add(a.slot);
        seenDelegaciones.add(a.delegacion_id);
    }

    // Clear previous slot_label assignments for this sport+gender
    // (so re-assigning works cleanly)
    await supabase
        .from('delegaciones')
        .update({ slot_label: null })
        .eq('disciplina_id', disciplina_id)
        .eq('genero', genero)
        .not('slot_label', 'is', null);

    // Fetch all delegaciones we'll assign
    const delegacionIds = assignments.map(a => a.delegacion_id);
    const { data: delegaciones } = await supabase
        .from('delegaciones')
        .select('id, nombre, carrera_ids')
        .in('id', delegacionIds);

    if (!delegaciones || delegaciones.length !== delegacionIds.length) {
        return NextResponse.json({ error: 'Algunas delegaciones no fueron encontradas' }, { status: 400 });
    }

    const delegacionById = new Map(delegaciones.map(d => [d.id, d]));

    const results = {
        assigned: 0,
        matches_updated: 0,
        errors: [] as string[],
    };

    for (const assignment of assignments) {
        const delegacion = delegacionById.get(assignment.delegacion_id);
        if (!delegacion) {
            results.errors.push(`Delegación ${assignment.delegacion_id} no encontrada`);
            continue;
        }

        // 1. Set slot_label on delegacion
        const { error: delErr } = await supabase
            .from('delegaciones')
            .update({ slot_label: assignment.slot })
            .eq('id', assignment.delegacion_id);

        if (delErr) {
            results.errors.push(`Error actualizando delegación "${delegacion.nombre}": ${delErr.message}`);
            continue;
        }

        // 2. Update all group matches where equipo_a = slot
        const { data: updatedA } = await supabase
            .from('partidos')
            .update({
                equipo_a: delegacion.nombre,
                delegacion_a: delegacion.nombre,
                delegacion_a_id: delegacion.id,
                carrera_a_ids: delegacion.carrera_ids || [],
            })
            .eq('disciplina_id', disciplina_id)
            .eq('genero', genero)
            .eq('equipo_a', assignment.slot)
            .select('id');

        // 3. Update all group matches where equipo_b = slot
        const { data: updatedB } = await supabase
            .from('partidos')
            .update({
                equipo_b: delegacion.nombre,
                delegacion_b: delegacion.nombre,
                delegacion_b_id: delegacion.id,
                carrera_b_ids: delegacion.carrera_ids || [],
            })
            .eq('disciplina_id', disciplina_id)
            .eq('genero', genero)
            .eq('equipo_b', assignment.slot)
            .select('id');

        results.assigned++;
        results.matches_updated += (updatedA?.length || 0) + (updatedB?.length || 0);
    }

    // Audit log
    await supabase.from('admin_audit_logs').insert({
        admin_id: user.id,
        admin_name: profile?.full_name ?? '',
        admin_email: user.email ?? '',
        action_type: 'SORTEO_ASSIGNMENT',
        entity_type: 'config',
        entity_id: `${disciplina_id}|${genero}`,
        details: {
            disciplina_id,
            genero,
            assignments_count: assignments.length,
            matches_updated: results.matches_updated,
        },
    }).then(() => {});

    return NextResponse.json({
        success: true,
        ...results,
    });
}
