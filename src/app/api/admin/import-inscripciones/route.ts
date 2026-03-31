import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createRouteSupabase } from '@/lib/supabase-route-handler';
import { fuzzyMatchCarrera, fuzzyMatchDisciplina } from '@/lib/excel-import';
import { EQUIPO_NOMBRE_TO_CARRERAS } from '@/lib/constants';

// ── Sheet name → { disciplina, genero } ──────────────────────────────────────
// Matches tab names like "Voleibol Femenino", "Fútbol Masculino"
const SHEET_NAME_MAP: Record<string, { disciplina: string; genero: 'masculino' | 'femenino' | 'mixto' }> = {
    'Voleibol Femenino':    { disciplina: 'Voleibol',   genero: 'femenino'  },
    'Voleibol Masculino':   { disciplina: 'Voleibol',   genero: 'masculino' },
    'Baloncesto Femenino':  { disciplina: 'Baloncesto', genero: 'femenino'  },
    'Baloncesto Masculino': { disciplina: 'Baloncesto', genero: 'masculino' },
    'Futbol Femenino':      { disciplina: 'Fútbol',     genero: 'femenino'  },
    'Futbol Masculino':     { disciplina: 'Fútbol',     genero: 'masculino' },
    'Fútbol Femenino':      { disciplina: 'Fútbol',     genero: 'femenino'  },
    'Fútbol Masculino':     { disciplina: 'Fútbol',     genero: 'masculino' },
    'Tenis Femenino':       { disciplina: 'Tenis',      genero: 'femenino'  },
    'Tenis Masculino':      { disciplina: 'Tenis',      genero: 'masculino' },
    'Tenis de Mesa':        { disciplina: 'Tenis de Mesa', genero: 'mixto'  },
    'Ajedrez':              { disciplina: 'Ajedrez',    genero: 'mixto'     },
    'Natación':             { disciplina: 'Natación',   genero: 'mixto'     },
    'Natacion':             { disciplina: 'Natación',   genero: 'mixto'     },
};

/**
 * Find the EQUIPOS table in a sheet.
 * Looks for a cell containing "EQUIPOS" (case-insensitive) and reads the
 * rows below it that have a numeric # in the adjacent column.
 *
 * The Excel layout for each discipline sheet is:
 *   Col H: #   (1, 2, 3 …)
 *   Col I: EQUIPOS  (team name)
 *   Col J: optional label (Campeón, Subcampeón)
 */
function extractEquiposFromSheet(sheet: XLSX.WorkSheet): string[] {
    const range = XLSX.utils.decode_range(sheet['!ref'] ?? 'A1:Z100');
    const equipos: string[] = [];

    // Scan all cells for "EQUIPOS" header
    let equiposCol = -1;
    let numberCol = -1;
    let headerRow = -1;

    for (let R = range.s.r; R <= range.e.r; R++) {
        for (let C = range.s.c; C <= range.e.c; C++) {
            const cell = sheet[XLSX.utils.encode_cell({ r: R, c: C })];
            if (!cell) continue;
            const val = String(cell.v ?? '').trim().toUpperCase();
            if (val === 'EQUIPOS') {
                equiposCol = C;
                headerRow = R;
                // The # column is usually one column to the left
                numberCol = C - 1;
                break;
            }
        }
        if (headerRow >= 0) break;
    }

    if (headerRow < 0 || equiposCol < 0) return equipos;

    // Read rows below the header until we hit an empty # cell or end of range
    for (let R = headerRow + 1; R <= range.e.r; R++) {
        const numCell = numberCol >= 0 ? sheet[XLSX.utils.encode_cell({ r: R, c: numberCol })] : null;
        const nameCell = sheet[XLSX.utils.encode_cell({ r: R, c: equiposCol })];

        if (!nameCell) break;
        const name = String(nameCell.v ?? '').trim();
        if (!name) break;

        // Validate the # cell is numeric (skip header-like rows)
        if (numCell) {
            const num = Number(numCell.v);
            if (isNaN(num)) continue;
        }

        equipos.push(name);
    }

    return equipos;
}

export async function POST(req: NextRequest) {
    const supabase = await createRouteSupabase();

    // ── Auth ──────────────────────────────────────────────────────────────────
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
        return NextResponse.json({ error: 'Sin permisos suficientes' }, { status: 403 });
    }

    // ── Parse file ────────────────────────────────────────────────────────────
    let formData: FormData;
    try {
        formData = await req.formData();
    } catch {
        return NextResponse.json({ error: 'Error al leer el archivo' }, { status: 400 });
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return NextResponse.json({ error: 'No se recibió ningún archivo' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array', cellDates: true });

    // ── Fetch DB context ──────────────────────────────────────────────────────
    const [{ data: carreras }, { data: disciplinas }] = await Promise.all([
        supabase.from('carreras').select('id, nombre'),
        supabase.from('disciplinas').select('id, name'),
    ]);

    if (!carreras || !disciplinas) {
        return NextResponse.json({ error: 'Error al cargar datos de referencia' }, { status: 500 });
    }

    // ── Process each sport sheet ──────────────────────────────────────────────
    type EnrollmentEntry = {
        carrera_id: number;
        disciplina_id: number;
        genero: string;
        equipo_nombre: string;
    };

    const entries: EnrollmentEntry[] = [];
    const unmatched: { sheet: string; equipo: string; carrera: string }[] = [];
    let sheetsParsed = 0;
    let teamsFound = 0;

    for (const sheetName of workbook.SheetNames) {
        // Skip general schedule sheet (first one) and "Inscritos" master sheet
        const sheetLower = sheetName.toLowerCase();
        if (sheetLower.includes('inscri') || sheetLower.includes('general') || sheetLower.includes('relaci')) {
            continue;
        }

        // Match sheet name to disciplina+genero
        const mapping = SHEET_NAME_MAP[sheetName];
        if (!mapping) {
            // Try fuzzy match on sheet name
            const parts = sheetName.split(' ');
            const discName = parts.slice(0, -1).join(' ');
            const generoRaw = parts[parts.length - 1]?.toLowerCase();
            const disciplinaId = fuzzyMatchDisciplina(discName, disciplinas);
            const genero = generoRaw === 'femenino' ? 'femenino' : generoRaw === 'masculino' ? 'masculino' : null;
            if (!disciplinaId || !genero) continue;
            mapping || Object.assign(mapping ?? {}, {
                disciplina: disciplinas.find(d => d.id === disciplinaId)?.name ?? discName,
                genero: genero as 'masculino' | 'femenino' | 'mixto',
            });
            // Use inline approach below
        }

        const resolvedMapping = mapping ?? (() => {
            const parts = sheetName.split(' ');
            const discName = parts.slice(0, -1).join(' ');
            const generoRaw = parts[parts.length - 1]?.toLowerCase();
            const disciplinaId = fuzzyMatchDisciplina(discName, disciplinas);
            const genero = generoRaw === 'femenino' ? 'femenino' : generoRaw === 'masculino' ? 'masculino' : 'mixto';
            if (!disciplinaId) return null;
            return {
                disciplina: disciplinas.find(d => d.id === disciplinaId)?.name ?? discName,
                genero: genero as 'masculino' | 'femenino' | 'mixto',
            };
        })();

        if (!resolvedMapping) continue;

        const disciplinaId = fuzzyMatchDisciplina(resolvedMapping.disciplina, disciplinas);
        if (!disciplinaId) continue;

        const sheet = workbook.Sheets[sheetName];
        const equipoNames = extractEquiposFromSheet(sheet);
        if (equipoNames.length === 0) continue;

        sheetsParsed++;
        teamsFound += equipoNames.length;

        for (const equipoNombre of equipoNames) {
            // Normalize: uppercase, trim
            const normalized = equipoNombre.trim().toUpperCase();

            // Look up in the static mapping first
            const carreraNames = EQUIPO_NOMBRE_TO_CARRERAS[normalized]
                ?? EQUIPO_NOMBRE_TO_CARRERAS[equipoNombre.trim()];

            if (carreraNames) {
                // Known combined or single team
                for (const carreraName of carreraNames) {
                    const carreraId = fuzzyMatchCarrera(carreraName, carreras);
                    if (carreraId) {
                        entries.push({
                            carrera_id: carreraId,
                            disciplina_id: disciplinaId,
                            genero: resolvedMapping.genero,
                            equipo_nombre: equipoNombre.trim(),
                        });
                    } else {
                        unmatched.push({ sheet: sheetName, equipo: equipoNombre, carrera: carreraName });
                    }
                }
            } else {
                // Unknown team — try fuzzy match directly
                const carreraId = fuzzyMatchCarrera(equipoNombre, carreras);
                if (carreraId) {
                    entries.push({
                        carrera_id: carreraId,
                        disciplina_id: disciplinaId,
                        genero: resolvedMapping.genero,
                        equipo_nombre: equipoNombre.trim(),
                    });
                } else {
                    unmatched.push({ sheet: sheetName, equipo: equipoNombre, carrera: equipoNombre });
                }
            }
        }
    }

    if (entries.length === 0) {
        return NextResponse.json({
            error: 'No se encontraron inscripciones. Verifica el formato del archivo.',
            sheets_found: workbook.SheetNames,
            unmatched,
        }, { status: 422 });
    }

    // ── UPSERT into carrera_disciplina ────────────────────────────────────────
    const { error: upsertError } = await supabase
        .from('carrera_disciplina')
        .upsert(entries, { onConflict: 'carrera_id,disciplina_id,genero' });

    if (upsertError) {
        return NextResponse.json({
            error: 'Error al guardar inscripciones',
            detail: upsertError.message,
        }, { status: 500 });
    }

    return NextResponse.json({
        message: `${entries.length} inscripciones importadas correctamente`,
        sheets_parsed: sheetsParsed,
        teams_found: teamsFound,
        carreras_enrolled: entries.length,
        unmatched,
        unmatched_count: unmatched.length,
    });
}
