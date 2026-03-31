// SERVER ONLY — do not import in client components.
// Parses the Uninorte Olympics schedule Excel (.xlsx) into fixture shells and
// team-registration (delegacion) records.
//
// The Excel has two zones of interest:
//   Sheet "POR DIA GENERAL"  → all matches in block format → fixture shells
//   Sheets per sport         → team lists per sport+gender → delegacion records
//
// Block format (POR DIA GENERAL):
//   Row type A — Block header:  col[0]=round text, col[8]=SPORT [GENDER]
//   Row type B — Column header: col[0]="EQUIPO A"  (ignored)
//   Row type C — Match row:     col[1]="Vs"        → extract data
//   Row type D — Special event: col[8]=sport, col[0] has "TODOS LOS PARTICIPANTES"
//   Empty row  → separator between blocks

import * as XLSX from 'xlsx';

// ─────────────────────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────────────────────

export interface ScheduleMatch {
    /** Sport name as stored in disciplinas.name (e.g. "Voleibol") */
    sport: string;
    /** Gender extracted from the block header (e.g. "femenino") */
    genero: 'masculino' | 'femenino';
    /** Round / phase label (e.g. "1era Ronda", "SEMIFINAL", "FINAL") */
    round: string;
    /** The title of the column (e.g. GRUPO vs LLAVE vs FINAL) */
    group_column_header?: string;
    /** Slot label for team A (e.g. "2B", "1ro. GRUPO A", "GANADOR LLAVE C") */
    slot_a: string;
    /** Slot label for team B */
    slot_b: string;
    /** Group or bracket identifier (e.g. "A", "B", "X", "Finalistas") */
    group_or_bracket: string;
    /** Venue name */
    venue: string;
    /** ISO 8601 timestamp in COT (America/Bogota, UTC-5) */
    scheduled_at: string;
    /** Source sheet name */
    sheet: string;
    /** Source row index (0-based) */
    row: number;
}

export interface ScheduleTeam {
    /** Raw name as it appears in the Excel team list */
    raw_name: string;
    /** Position in the team list (1-based) */
    position: number;
    /** Sport name (canonical, e.g. "Voleibol") */
    sport: string;
    /** Gender */
    genero: 'masculino' | 'femenino';
    /** Source sheet */
    sheet: string;
}

export interface ScheduleParseResult {
    matches: ScheduleMatch[];
    teams: ScheduleTeam[];
    errors: Array<{ sheet: string; row: number; message: string }>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sport name normalization
// Maps Excel labels (uppercase, possibly with gender suffix) → canonical name
// ─────────────────────────────────────────────────────────────────────────────

const SPORT_MAP: Record<string, string> = {
    'VOLEIBOL':      'Voleibol',
    'VOLLEYBALL':    'Voleibol',
    'FUTBOL':        'Fútbol',
    'FÚTBOL':        'Fútbol',
    'FOOTBALL':      'Fútbol',
    'BALONCESTO':    'Baloncesto',
    'BASKETBALL':    'Baloncesto',
    'AJEDREZ':       'Ajedrez',
    'CHESS':         'Ajedrez',
    'TENIS DE MESA': 'Tenis de Mesa',
    'TABLE TENNIS':  'Tenis de Mesa',
    'NATACIÓN':      'Natación',
    'NATACION':      'Natación',
    'SWIMMING':      'Natación',
    'TENIS':         'Tenis',
    'TENNIS':        'Tenis',
};

const GENDER_KEYWORDS_F = ['FEMENINO', 'FEMENINA', 'WOMEN', 'FEMALE', 'FEM'];
const GENDER_KEYWORDS_M = ['MASCULINO', 'MASCULINA', 'MEN', 'MALE', 'MASC'];

/**
 * Given a raw sport+gender string from the Excel (e.g. "VOLEIBOL FEMENINO"),
 * returns { sport: "Voleibol", genero: "femenino" } or null if unrecognized.
 */
function parseSportLabel(raw: string): { sport: string; genero: 'masculino' | 'femenino' } | null {
    const upper = raw.trim().toUpperCase();

    let genero: 'masculino' | 'femenino' = 'masculino';
    if (GENDER_KEYWORDS_F.some(kw => upper.includes(kw))) genero = 'femenino';

    // Try longest match first so "TENIS DE MESA" wins over "TENIS"
    const sportKeys = Object.keys(SPORT_MAP).sort((a, b) => b.length - a.length);
    for (const key of sportKeys) {
        if (upper.includes(key)) {
            return { sport: SPORT_MAP[key], genero };
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Date/time parsing
// ─────────────────────────────────────────────────────────────────────────────

const MONTH_ES: Record<string, number> = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12,
};

const MONTH_EN: Record<string, number> = {
    january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
    july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

/**
 * Parses the date cell value into a { year, month, day } triple.
 * Handles:
 *   - JS Date objects (SheetJS converts Excel serial dates)
 *   - English text: "Thursday, April 09, 2026"
 *   - Spanish text: "jueves, 9 de abril de 2026"
 */
function parseDate(raw: unknown): { year: number; month: number; day: number } | null {
    if (raw instanceof Date) {
        return { year: raw.getFullYear(), month: raw.getMonth() + 1, day: raw.getDate() };
    }
    if (typeof raw !== 'string' || !raw.trim()) return null;

    const s = raw.trim().toLowerCase();

    // English: "thursday, april 09, 2026" or "april 09, 2026"
    const enMatch = s.match(/(\w+)\s+(\d{1,2}),?\s+(\d{4})/);
    if (enMatch) {
        const month = MONTH_EN[enMatch[1]];
        if (month) {
            return { year: parseInt(enMatch[3]), month, day: parseInt(enMatch[2]) };
        }
        // Month may be first word after weekday comma: "thursday, april 09, 2026"
        const parts = s.split(',').map(p => p.trim());
        for (const part of parts) {
            const m = part.match(/(\w+)\s+(\d{1,2})\s+(\d{4})/);
            if (m && MONTH_EN[m[1]]) {
                return { year: parseInt(m[3]), month: MONTH_EN[m[1]], day: parseInt(m[2]) };
            }
        }
    }

    // Spanish: "jueves, 9 de abril de 2026"
    const esMatch = s.match(/(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
    if (esMatch) {
        const month = MONTH_ES[esMatch[2]];
        if (month) {
            return { year: parseInt(esMatch[3]), month, day: parseInt(esMatch[1]) };
        }
    }

    // ISO fallback: "2026-04-09"
    const isoMatch = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) {
        return { year: parseInt(isoMatch[1]), month: parseInt(isoMatch[2]), day: parseInt(isoMatch[3]) };
    }

    return null;
}

/**
 * Parses the time cell value into a { hour, minute } pair (24h).
 * Handles:
 *   - JS Date objects (SheetJS may parse time-only cells as 1899-12-30T08:00:00)
 *   - "8:00 AM", "12:30 PM", "2:00 PM"
 *   - "8:00", "9:30", "12:30" — no AM/PM (football matches)
 *     Heuristic: treat as AM if hour <= 12, and use context (all football games
 *     in this schedule are between 8am and 12:30pm, so pure 24h is fine for <=12)
 */
function parseTime(raw: unknown): { hour: number; minute: number } | null {
    if (raw instanceof Date) {
        return { hour: raw.getHours(), minute: raw.getMinutes() };
    }
    if (typeof raw !== 'string' || !raw.trim()) return null;

    const s = raw.trim().toUpperCase();

    // With AM/PM
    const ampmMatch = s.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (ampmMatch) {
        let hour = parseInt(ampmMatch[1]);
        const minute = parseInt(ampmMatch[2]);
        if (ampmMatch[3] === 'PM' && hour < 12) hour += 12;
        if (ampmMatch[3] === 'AM' && hour === 12) hour = 0;
        return { hour, minute };
    }

    // Without AM/PM (e.g. football: "8:00", "9:30", "12:30")
    const plainMatch = s.match(/^(\d{1,2}):(\d{2})$/);
    if (plainMatch) {
        const hour = parseInt(plainMatch[1]);
        const minute = parseInt(plainMatch[2]);
        // All plain-time slots in this schedule are morning/early-afternoon (8–13h)
        // so the numeric value is already correct as 24h.
        return { hour, minute };
    }

    return null;
}

/**
 * Combines date + time into an ISO 8601 string at COT (UTC-5).
 */
function buildTimestamp(
    date: { year: number; month: number; day: number },
    time: { hour: number; minute: number }
): string {
    const pad = (n: number) => String(n).padStart(2, '0');
    // COT = UTC-5, represented as offset -05:00
    return `${date.year}-${pad(date.month)}-${pad(date.day)}T${pad(time.hour)}:${pad(time.minute)}:00-05:00`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Cell helpers
// ─────────────────────────────────────────────────────────────────────────────

function cell(row: unknown[], idx: number): string {
    const v = row[idx];
    if (v == null) return '';
    return String(v).trim();
}

function isEmptyRow(row: unknown[]): boolean {
    return row.every(v => v == null || String(v).trim() === '');
}

function isHeaderRow(row: unknown[]): boolean {
    // "EQUIPO A" in first non-empty cell (cols 0-3)
    for (let i = 0; i < Math.min(4, row.length); i++) {
        if (String(row[i] ?? '').toUpperCase().includes('EQUIPO A')) return true;
    }
    return false;
}

function isMatchRow(row: unknown[]): boolean {
    // "Vs" appears in one of the first 4 cells
    for (let i = 0; i < Math.min(4, row.length); i++) {
        if (String(row[i] ?? '').trim() === 'Vs') return true;
    }
    return false;
}

function isSpecialEventRow(row: unknown[]): boolean {
    // "TODOS LOS PARTICIPANTES" in col 0
    return String(row[0] ?? '').toUpperCase().includes('TODOS LOS PARTICIPANTES');
}

function isBlockHeaderRow(row: unknown[]): boolean {
    // Last non-empty cell contains a sport label AND "Vs" is not present
    if (isMatchRow(row) || isHeaderRow(row)) return false;
    const last = [...row].reverse().find(v => String(v ?? '').trim() !== '');
    if (!last) return false;
    const upper = String(last).toUpperCase();
    return Object.keys(SPORT_MAP).some(key => upper.includes(key));
}

// ─────────────────────────────────────────────────────────────────────────────
// Main parser: sheet "POR DIA GENERAL"
// ─────────────────────────────────────────────────────────────────────────────

function parseGeneralSheet(
    rows: unknown[][],
    sheetName: string
): { matches: ScheduleMatch[]; errors: Array<{ sheet: string; row: number; message: string }> } {
    const matches: ScheduleMatch[] = [];
    const errors: Array<{ sheet: string; row: number; message: string }> = [];

    let currentSport: string | null = null;
    let currentGenero: 'masculino' | 'femenino' = 'masculino';
    let currentRound: string | null = null;
    let currentGroupHeader: string | null = null;

    for (let rowIdx = 0; rowIdx < rows.length; rowIdx++) {
        const row = rows[rowIdx];
        if (!row || isEmptyRow(row)) continue;
        
        if (isHeaderRow(row)) {
            // Track what the "Grupo/Llave" column is actually named
            for (const v of row) {
                const upper = String(v ?? '').trim().toUpperCase();
                if (['GRUPO', 'LLAVES', 'LLAVE', 'PARTIDO', 'FINAL'].includes(upper)) {
                    currentGroupHeader = upper;
                }
            }
            continue;
        }

        if (isSpecialEventRow(row)) continue; // events handled separately

        if (isBlockHeaderRow(row)) {
            // Extract sport+gender from the last non-empty cell (col 8 / col index 8)
            // Extract round from the first non-empty cell(s)
            
            // Also reset group header because it's a new block
            currentGroupHeader = null;

            const last = [...row].reverse().find(v => String(v ?? '').trim() !== '');
            const parsed = parseSportLabel(String(last ?? ''));
            if (parsed) {
                currentSport = parsed.sport;
                currentGenero = parsed.genero;
            } else {
                errors.push({ sheet: sheetName, row: rowIdx, message: `No se reconoció el deporte en: "${last}"` });
                currentSport = null;
            }

            // Round: first non-empty cell, strip trailing dashes/spaces
            const roundRaw = cell(row, 0) || cell(row, 1) || cell(row, 2);
            currentRound = roundRaw.replace(/[-–]+$/, '').trim() || null;
            continue;
        }

        if (isMatchRow(row)) {
            if (!currentSport || !currentRound) {
                errors.push({ sheet: sheetName, row: rowIdx, message: 'Fila de partido sin bloque de deporte/ronda activo' });
                continue;
            }

            // In POR DIA GENERAL the structure is offset-free:
            // col[0]=slot_a, col[1]="Vs", col[2]="", col[3]=slot_b,
            // col[4]=group, col[5]=venue, col[6]=date, col[7]=time
            // Some sport sheets have a leading empty col — handled below.
            let offset = 0;
            if (cell(row, 0) === '' && cell(row, 1) !== 'Vs') offset = 1;
            if (cell(row, 0) === '' && cell(row, 1) === '' && cell(row, 2) === 'Vs') offset = 2;
            // Detect "Vs" position for robustness
            for (let i = 0; i < Math.min(4, row.length); i++) {
                if (cell(row, i) === 'Vs') { offset = i - 1; break; }
            }

            const slot_a         = cell(row, offset);
            // offset+1 = "Vs", offset+2 = "" (merged), offset+3 = slot_b
            const slot_b         = cell(row, offset + 3);
            const group_or_bracket = cell(row, offset + 4);
            const venue          = cell(row, offset + 5);
            const dateRaw        = row[offset + 6];
            const timeRaw        = row[offset + 7];

            // Skip "Descansa" rows
            if (String(venue ?? '').toLowerCase().includes('descansa')) continue;
            // Skip rows where slots are "0" (bye placeholder)
            if (slot_a === '0' || slot_b === '0') continue;

            const dateParsed = parseDate(dateRaw);
            const timeParsed = parseTime(timeRaw);

            if (!dateParsed) {
                errors.push({ sheet: sheetName, row: rowIdx, message: `Fecha no reconocida: "${dateRaw}"` });
                continue;
            }
            if (!timeParsed) {
                errors.push({ sheet: sheetName, row: rowIdx, message: `Hora no reconocida: "${timeRaw}"` });
                continue;
            }
            if (!slot_a || !slot_b) {
                errors.push({ sheet: sheetName, row: rowIdx, message: 'Slots de equipo vacíos' });
                continue;
            }

            matches.push({
                sport: currentSport,
                genero: currentGenero,
                round: currentRound,
                group_column_header: currentGroupHeader || undefined,
                slot_a,
                slot_b,
                group_or_bracket,
                venue,
                scheduled_at: buildTimestamp(dateParsed, timeParsed),
                sheet: sheetName,
                row: rowIdx,
            });
        }
    }

    return { matches, errors };
}

// ─────────────────────────────────────────────────────────────────────────────
// Team registration parser: per-sport sheets
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Reads team registration lists from individual sport sheets.
 * Teams appear in a numbered list: col[N] = position number, col[N+1] = team name.
 * The sport+gender are inferred from the sheet name or a title row.
 */
function parseTeamSheet(
    rows: unknown[][],
    sheetName: string
): ScheduleTeam[] {
    const teams: ScheduleTeam[] = [];

    // Detect sport+gender from sheet name (e.g. "Voleibol Femenino")
    const sportLabel = parseSportLabel(sheetName);
    if (!sportLabel) return teams;

    const seen = new Set<string>();

    for (const row of rows) {
        // Look for pattern: integer in any column, followed by a non-empty team name
        for (let c = 0; c < row.length - 1; c++) {
            const v = String(row[c] ?? '').trim();
            const num = parseInt(v);
            if (!v || isNaN(num) || num < 1 || num > 25) continue;

            const name = String(row[c + 1] ?? '').trim();
            if (!name) continue;

            // Skip header-like values
            const upper = name.toUpperCase();
            if (
                upper === 'EQUIPOS' || upper === '#' ||
                upper === 'PROGRAMAS' || upper.startsWith('EQUIPO') ||
                upper === 'N°' || upper === 'N' ||
                // Slot labels like "1A", "2B" — not real team names
                /^\d[A-Z]$/.test(name)
            ) continue;

            // Skip duplicate team names within this sport sheet
            const key = `${sportLabel.sport}|${sportLabel.genero}|${name}`;
            if (seen.has(key)) continue;
            seen.add(key);

            teams.push({
                raw_name: name,
                position: num,
                sport: sportLabel.sport,
                genero: sportLabel.genero,
                sheet: sheetName,
            });
        }
    }

    // Deduplicate by position (keep first occurrence at each position number)
    const byPos = new Map<number, ScheduleTeam>();
    for (const t of teams) {
        if (!byPos.has(t.position)) byPos.set(t.position, t);
    }

    return [...byPos.values()].sort((a, b) => a.position - b.position);
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parses the Uninorte Olympics schedule Excel file.
 *
 * @param buffer  Raw file buffer (from file.arrayBuffer())
 * @returns       { matches, teams, errors }
 */
export function parseScheduleExcel(buffer: Buffer): ScheduleParseResult {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, defval: '' } as any);

    const result: ScheduleParseResult = { matches: [], teams: [], errors: [] };

    for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            raw: false,   // dates as strings where possible
        });

        // SheetJS raw:false still returns Date objects for true date cells.
        // We re-read with raw:true to get Date objects for date/time columns:
        const rowsRaw: unknown[][] = XLSX.utils.sheet_to_json(sheet, {
            header: 1,
            defval: '',
            raw: true,
        });

        // Merge: use rowsRaw for date/time cells (cols 6 & 7), text for rest
        const mergedRows = rows.map((row, ri) => {
            const raw = rowsRaw[ri] ?? [];
            return row.map((v, ci) => {
                // Date cell: use raw (Date object) when available
                if ((ci === 6 || ci === 7) && raw[ci] instanceof Date) return raw[ci];
                // Also handle offset variants (sport-specific sheets offset by 1-2)
                if ((ci === 7 || ci === 8 || ci === 9 || ci === 10) && raw[ci] instanceof Date) return raw[ci];
                return v;
            });
        });

        const isPorDiaGeneral = sheetName.toLowerCase().includes('por dia') ||
                                sheetName.toLowerCase().includes('general');

        if (isPorDiaGeneral) {
            const { matches, errors } = parseGeneralSheet(mergedRows, sheetName);
            result.matches.push(...matches);
            result.errors.push(...errors);
        } else {
            // Sport-specific sheet: parse team registrations
            const teams = parseTeamSheet(mergedRows, sheetName);
            result.teams.push(...teams);
        }
    }

    return result;
}
