import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { parseScheduleExcel } from '@/lib/schedule-parser';
import type { ScheduleMatch, ScheduleTeam } from '@/lib/schedule-parser';

export const maxDuration = 60;

// ─────────────────────────────────────────────────────────────────────────────
// Known career fusions: raw name from Excel → array of canonical carrera names
// (must match exactly what is in carreras.nombre)
// ─────────────────────────────────────────────────────────────────────────────

const FUSION_MAP: Record<string, string[]> = {
    // Acronyms
    'DCPRI':  ['Derecho', 'Ciencia Política y Gobierno', 'Relaciones Internacionales'],
    'EAUD':   ['Diseño Gráfico', 'Arquitectura', 'Diseño Industrial'],

    // Slash fusions — all case-insensitive keys are checked via normalize() below
    'ING. ELÉCTRICA/CIENCIA DATOS':               ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ciencia de Datos'],
    'INGENIERÍA ELÉCTRICA/CIENCIA DATOS':          ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ciencia de Datos'],
    'ING.A ELÉCTRICA/CIENCIA DATOS':               ['Ingeniería Eléctrica', 'Ingeniería Electrónica', 'Ciencia de Datos'],
    'COM. SOCIAL/PSICOLOGÍA':                      ['Comunicación Social y Periodismo', 'Psicología'],
    'LENGUAS MODERNAS/PSICOLOGÍA':                 ['Lenguas Modernas y Cultura', 'Psicología'],
    'LENG. MOD./PSICOLOGÍA':                       ['Lenguas Modernas y Cultura', 'Psicología'],
    'PSICOLOGÍA/LENG. MOD.':                       ['Psicología', 'Lenguas Modernas y Cultura'],
    'ODONTOLOGÍA/CONTADURÍA':                      ['Odontología', 'Contaduría Pública'],
    'MÚSICA/PSICOLOGÍA':                           ['Música', 'Psicología'],
    'NEGOCIOS INT./ADMÓN.':                        ['Negocios Internacionales', 'Administración de Empresas'],
    'ING. INDUSTRIAL/MECÁNICA':                    ['Ingeniería Industrial', 'Ingeniería Mecánica'],
    'INGENIERÍA INDUSTRIAL/MECÁNICA':              ['Ingeniería Industrial', 'Ingeniería Mecánica'],
    'HUMANIDES(PSICOLOGÍA/COM.SOCIAL/ECONOMÍA)':   ['Psicología', 'Comunicación Social y Periodismo', 'Economía'],
    'HUMANIDADES(PSICOLOGÍA/COM.SOCIAL/ECONOMÍA)': ['Psicología', 'Comunicación Social y Periodismo', 'Economía'],
    'ECONOMÁ/COM. SOCIAL':                         ['Economía', 'Comunicación Social y Periodismo'],
    'ECONOMÍA/COM. SOCIAL':                        ['Economía', 'Comunicación Social y Periodismo'],
    'ESCUELA DE NEGOCIOS':                         ['Negocios Internacionales'],

    // Typos in fútbol masculino
    'DRECHO':             ['Derecho'],
    'CIENCIA POLÍTICA':   ['Ciencia Política y Gobierno'],
    'ING. CIVIL':         ['Ingeniería Civil'],
    'ING. MECÁNICA':      ['Ingeniería Mecánica'],
    'ADMON. DE EMPRESAS': ['Administración de Empresas'],
    'ING. SISTEMAS':      ['Ingeniería de Sistemas'],
    'ING. INDUSTRIAL':    ['Ingeniería Industrial'],
    'ING. ELÉCTRICA':     ['Ingeniería Eléctrica', 'Ingeniería Electrónica'],
    'INGENIERÍA ELÉCTRICA': ['Ingeniería Eléctrica', 'Ingeniería Electrónica'],
    'NEGOCIOS INTERNACIONALES': ['Negocios Internacionales'],
    'CONTADURÍA PÚBLICA': ['Contaduría Pública'],
};

/** Normalizes raw round names from the Excel to canonical fase values. */
function normalizeFase(round: string, grupo: string, group_column_header?: string): string {
    const r = (round || '').toLowerCase().trim();
    const h = (group_column_header || '').toUpperCase();
    
    // Si la columna explícitamente se llama LLAVE, LLAVES, PARTIDO o FINAL, es 100% seguro que es eliminación:
    if (h === 'LLAVE' || h === 'LLAVES' || h === 'PARTIDO' || h === 'FINAL') {
        if (h === 'FINAL') return 'final';
        
        // Tratar de inferir la ronda exacta desde "round"
        if (r.includes('tercer') || r.includes('3er') || r.includes('3º')) return 'tercer_puesto';
        if (r.includes('semi')) return 'semifinal';
        if (r.includes('cuarto')) return 'cuartos';
        if (r.includes('octavo')) return 'octavos';
        
        // Por defecto
        return 'eliminacion';
    }

    if (r.includes('tercer') || r.includes('3er') || r.includes('3º'))  return 'tercer_puesto';
    if (r.includes('semi'))                                               return 'semifinal';
    if (r.includes('cuarto'))                                             return 'cuartos';
    if (r.includes('final'))                                              return 'final';
    if (/^[A-Z]$/i.test((grupo || '').trim()))                            return 'grupos';
    return 'eliminacion';
}

function normKey(s: string): string {
    return s.trim().toUpperCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')   // strip accents
        .replace(/\s+/g, ' ');
}

/** Returns canonical carrera names for a raw team name (handles fusions + typos). */
function resolveCarreras(rawName: string): string[] | null {
    const key = normKey(rawName);
    // Direct match (after accent stripping)
    for (const [mapKey, val] of Object.entries(FUSION_MAP)) {
        if (normKey(mapKey) === key) return val;
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/schedule
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
    const supabase = await createRouteSupabase();

    // ── Auth ──────────────────────────────────────────────────────────────────
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
        return NextResponse.json({ error: 'Solo admins pueden crear el fixture' }, { status: 403 });
    }

    // ── Parse request ────────────────────────────────────────────────────────
    let formData: FormData;
    try {
        formData = await request.formData();
    } catch {
        return NextResponse.json({ error: 'Error al leer el formulario' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
        return NextResponse.json({ error: 'Solo se aceptan archivos .xlsx o .xls' }, { status: 400 });
    }

    const dryRun = formData.get('dry_run') === 'true';

    // ── Parse Excel ───────────────────────────────────────────────────────────
    const buffer = Buffer.from(await file.arrayBuffer());
    let parsed;
    try {
        parsed = parseScheduleExcel(buffer);
    } catch (e: any) {
        return NextResponse.json({ error: `Error al parsear el Excel: ${e.message}` }, { status: 400 });
    }

    if (parsed.matches.length === 0) {
        return NextResponse.json({
            error: 'No se encontraron partidos en el archivo',
            parse_errors: parsed.errors,
        }, { status: 400 });
    }

    // ── Fetch lookup data from DB ─────────────────────────────────────────────
    const [disciplinasRes, carrerasRes] = await Promise.all([
        supabase.from('disciplinas').select('id, name'),
        supabase.from('carreras').select('id, nombre'),
    ]);

    const disciplinas: { id: number; name: string }[] = disciplinasRes.data ?? [];
    const carreras: { id: number; nombre: string }[] = carrerasRes.data ?? [];

    const disciplinaByName = new Map(disciplinas.map(d => [d.name.toLowerCase(), d.id]));
    const carreraByNombre  = new Map(carreras.map(c => [c.nombre.toLowerCase(), c.id]));

    // ── Dry run response ──────────────────────────────────────────────────────
    if (dryRun) {
        // Validate matches and teams without writing anything
        const { matchIssues, teamIssues, summary } = validateParsed(
            parsed.matches, parsed.teams, disciplinaByName, carreraByNombre
        );
        return NextResponse.json({
            dry_run: true,
            matches_found:    parsed.matches.length,
            teams_found:      parsed.teams.length,
            parse_errors:     parsed.errors,
            match_issues:     matchIssues,
            team_issues:      teamIssues,
            summary,
        });
    }

    // ── Commit ────────────────────────────────────────────────────────────────
    const created = {
        partidos:     0,
        delegaciones: 0,
        skipped:      0,
        errors:       [] as string[],
    };

    // Step 1: Register delegaciones (one per team per sport+gender)
    // Maps "sport|genero|rawName" → delegacion_id (for later partido linking, future use)
    const delegacionMap = new Map<string, number>();

    for (const team of parsed.teams) {
        const disciplinaId = disciplinaByName.get(team.sport.toLowerCase());
        if (!disciplinaId) {
            created.errors.push(`Disciplina no encontrada para equipo "${team.raw_name}" (${team.sport})`);
            continue;
        }

        const carreraNames = resolveCarreras(team.raw_name) ?? [team.raw_name];
        const carreraIds: number[] = [];
        for (const nombre of carreraNames) {
            const id = carreraByNombre.get(nombre.toLowerCase());
            if (id) {
                carreraIds.push(id);
            } else {
                created.errors.push(`Carrera no encontrada en BD: "${nombre}" (equipo: "${team.raw_name}")`);
            }
        }

        // Display name: use the raw name cleaned up for readability
        const displayName = team.raw_name
            .replace(/\s*\/\s*/g, ' / ')
            .replace(/\s+/g, ' ')
            .trim();

        const { data: delegacion, error: delError } = await supabase
            .from('delegaciones')
            .upsert(
                { nombre: displayName, disciplina_id: disciplinaId, genero: team.genero, carrera_ids: carreraIds },
                { onConflict: 'disciplina_id,genero,nombre', ignoreDuplicates: false }
            )
            .select('id')
            .single();

        if (delError || !delegacion) {
            created.errors.push(`Error al crear delegación "${displayName}": ${delError?.message}`);
            continue;
        }

        delegacionMap.set(`${team.sport}|${team.genero}|${team.raw_name}`, delegacion.id);
        created.delegaciones++;
    }

    // Step 2: Insert fixture shell partidos
    for (const match of parsed.matches) {
        const disciplinaId = disciplinaByName.get(match.sport.toLowerCase());
        if (!disciplinaId) {
            created.errors.push(`Disciplina no encontrada: "${match.sport}" (fila ${match.row})`);
            continue;
        }

        // Check for duplicates: same disciplina + genero + scheduled_at + slot labels
        const { data: existing } = await supabase
            .from('partidos')
            .select('id')
            .eq('disciplina_id', disciplinaId)
            .eq('genero', match.genero)
            .eq('fecha', match.scheduled_at)
            .eq('equipo_a', match.slot_a)
            .eq('equipo_b', match.slot_b)
            .maybeSingle();

        if (existing) {
            created.skipped++;
            continue;
        }

        const { error: insertError } = await supabase
            .from('partidos')
            .insert({
                disciplina_id: disciplinaId,
                genero:        match.genero,
                equipo_a:      match.slot_a,
                equipo_b:      match.slot_b,
                fecha:         match.scheduled_at,
                estado:        'programado',
                fase:          normalizeFase(match.round, match.group_or_bracket, match.group_column_header),
                grupo:         match.group_or_bracket,
                lugar:         match.venue,
                // carrera_a_id / carrera_b_id / delegacion_a_id / delegacion_b_id:
                // left NULL — assigned later via the team-assignment panel
                carrera_a_ids: [],
                carrera_b_ids: [],
            });

        if (insertError) {
            created.errors.push(`Error al insertar partido (fila ${match.row}): ${insertError.message}`);
            continue;
        }
        created.partidos++;
    }

    // ── Audit log ─────────────────────────────────────────────────────────────
    await supabase.from('admin_audit_logs').insert({
        admin_id:    user.id,
        admin_name:  profile?.full_name ?? '',
        admin_email: '',
        action_type: 'SCHEDULE_IMPORT',
        entity_type: 'config',
        entity_id:   file.name,
        details: {
            filename:           file.name,
            partidos_creados:   created.partidos,
            delegaciones_reg:   created.delegaciones,
            partidos_skipped:   created.skipped,
            errors_count:       created.errors.length,
        },
    }).then(() => {});

    return NextResponse.json({
        success:           true,
        partidos_creados:  created.partidos,
        delegaciones_reg:  created.delegaciones,
        partidos_skipped:  created.skipped,
        parse_errors:      parsed.errors,
        commit_errors:     created.errors,
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation helper (used by dry run)
// ─────────────────────────────────────────────────────────────────────────────

function validateParsed(
    matches: ScheduleMatch[],
    teams: ScheduleTeam[],
    disciplinaByName: Map<string, number>,
    carreraByNombre: Map<string, number>
) {
    const matchIssues: string[] = [];
    const teamIssues:  string[] = [];

    for (const m of matches) {
        if (!disciplinaByName.has(m.sport.toLowerCase())) {
            matchIssues.push(`Disciplina desconocida: "${m.sport}" (fila ${m.row})`);
        }
    }

    for (const t of teams) {
        if (!disciplinaByName.has(t.sport.toLowerCase())) {
            teamIssues.push(`Disciplina desconocida: "${t.sport}" (hoja ${t.sheet})`);
            continue;
        }
        const carreraNames = resolveCarreras(t.raw_name) ?? [t.raw_name];
        for (const nombre of carreraNames) {
            if (!carreraByNombre.has(nombre.toLowerCase())) {
                teamIssues.push(`Carrera no encontrada en BD: "${nombre}" (equipo "${t.raw_name}", ${t.sport} ${t.genero})`);
            }
        }
    }

    // Summary by sport
    const summary: Record<string, number> = {};
    for (const m of matches) {
        const key = `${m.sport} ${m.genero}`;
        summary[key] = (summary[key] ?? 0) + 1;
    }

    return { matchIssues, teamIssues, summary };
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/admin/schedule -> Wipes out the entire fixture
// ─────────────────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
    const supabase = await createRouteSupabase();

    // Requires admin privileges
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const { data: profile } = await supabase
        .from('profiles')
        .select('roles, full_name')
        .eq('id', user.id)
        .single();

    const roles: string[] = profile?.roles ?? [];
    if (!roles.includes('admin') && !roles.includes('staff')) {
        return NextResponse.json({ error: 'Prohibido' }, { status: 403 });
    }

    try {
        // Delete ALL matches. Since the user asked for a complete wipe, we delete everything.
        // It relies on RLS or the backend having power. Wait, createRouteSupabase uses the logged-in user.
        // If the user has update/delete rights via RLS, this will work.
        const { error: delErr } = await supabase
            .from('partidos')
            .delete()
            .neq('id', -1); // Delete all rows trick for Supabase (using -1 since id is bigint)

        if (delErr) throw delErr;

        // Log the action
        await supabase.from('admin_audit_logs').insert({
            admin_id:    user.id,
            admin_name:  profile?.full_name ?? '',
            admin_email: '',
            action_type: 'FIXTURE_PURGED',
            entity_type: 'config',
            entity_id:   'all',
            details: { action: 'Todos los partidos fueron eliminados' },
        }).then(() => {});

        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error('DELETE Fixture Error:', e);
        return NextResponse.json({ error: e.message || 'Error al purgar el fixture' }, { status: 500 });
    }
}
