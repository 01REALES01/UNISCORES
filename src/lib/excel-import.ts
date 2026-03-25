// SERVER ONLY — do not import in client components
// This module uses the xlsx package which requires Node.js built-ins.

import * as XLSX from 'xlsx';
import type { ValidationMessage } from '@/modules/puntos/types';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type ExcelRowType = 'partido' | 'evento' | 'roster';

export interface ParsedRow {
    sheet_name: string;
    row_number: number;
    row_type: ExcelRowType;
    raw_data: Record<string, unknown>;
}

export interface MatchedRow extends ParsedRow {
    matched_data: Record<string, unknown>;
    validation_status: 'ok' | 'warning' | 'error';
    validation_messages: ValidationMessage[];
}

export interface ImportContext {
    carreras: { id: number; nombre: string }[];
    disciplinas: { id: number; name: string }[];
    partidos: {
        id: number;
        carrera_a_id: number | null;
        carrera_b_id: number | null;
        disciplina_id: number;
        fecha: string;
        equipo_a: string;
        equipo_b: string;
    }[];
    jugadores: {
        id: number;
        nombre: string;
        numero: number | null;
        carrera_id: number | null;
    }[];
}

// ─────────────────────────────────────────────────────────────────────────────
// String normalization helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
    return s
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove accents
        .replace(/[^a-z0-9\s]/g, '')     // remove punctuation
        .replace(/\s+/g, ' ');
}

function normalizeHeader(h: string): string {
    return normalize(String(h)).replace(/\s/g, '_');
}

// ─────────────────────────────────────────────────────────────────────────────
// Levenshtein distance (for fuzzy matching)
// ─────────────────────────────────────────────────────────────────────────────

function levenshtein(a: string, b: string): number {
    const m = a.length, n = b.length;
    const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
        Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
    );
    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            dp[i][j] = a[i - 1] === b[j - 1]
                ? dp[i - 1][j - 1]
                : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
    }
    return dp[m][n];
}

function similarity(a: string, b: string): number {
    const na = normalize(a), nb = normalize(b);
    if (na === nb) return 1;
    const maxLen = Math.max(na.length, nb.length);
    if (maxLen === 0) return 1;
    return 1 - levenshtein(na, nb) / maxLen;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fuzzy matchers
// ─────────────────────────────────────────────────────────────────────────────

const CARRERA_THRESHOLD = 0.72;
const JUGADOR_THRESHOLD = 0.80;

export function fuzzyMatchCarrera(
    name: string,
    carreras: { id: number; nombre: string }[]
): number | null {
    if (!name) return null;
    let best: { id: number; score: number } | null = null;
    for (const c of carreras) {
        const score = similarity(name, c.nombre);
        if (!best || score > best.score) best = { id: c.id, score };
    }
    return best && best.score >= CARRERA_THRESHOLD ? best.id : null;
}

export function fuzzyMatchDisciplina(
    name: string,
    disciplinas: { id: number; name: string }[]
): number | null {
    if (!name) return null;
    let best: { id: number; score: number } | null = null;
    for (const d of disciplinas) {
        const score = similarity(name, d.name);
        if (!best || score > best.score) best = { id: d.id, score };
    }
    return best && best.score >= 0.70 ? best.id : null;
}

export function fuzzyMatchJugador(
    nombre: string,
    numero: number | null,
    jugadores: { id: number; nombre: string; numero: number | null; carrera_id: number | null }[],
    carreraId?: number | null
): number | null {
    if (!nombre) return null;

    // Subset by carrera if provided
    const pool = carreraId != null
        ? jugadores.filter(j => j.carrera_id === carreraId)
        : jugadores;

    // 1. Exact match: normalized name + same number
    if (numero != null) {
        const exact = pool.find(
            j => normalize(j.nombre) === normalize(nombre) && j.numero === numero
        );
        if (exact) return exact.id;
    }

    // 2. Exact name match
    const exactName = pool.find(j => normalize(j.nombre) === normalize(nombre));
    if (exactName) return exactName.id;

    // 3. Fuzzy name match
    let best: { id: number; score: number } | null = null;
    for (const j of pool) {
        const score = similarity(nombre, j.nombre);
        if (!best || score > best.score) best = { id: j.id, score };
    }
    return best && best.score >= JUGADOR_THRESHOLD ? best.id : null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Row type detection
// ─────────────────────────────────────────────────────────────────────────────

function detectRowType(headers: Set<string>): ExcelRowType | null {
    // partido: has date + team columns
    const hasDate = headers.has('fecha') || headers.has('date') || headers.has('hora');
    const hasTeams = headers.has('equipo_a') || headers.has('carrera_a') || headers.has('local');
    if (hasDate && hasTeams) return 'partido';

    // evento: has event type or minute
    const hasEventType = headers.has('tipo_evento') || headers.has('tipo') || headers.has('evento');
    const hasMinuto = headers.has('minuto') || headers.has('min');
    if (hasEventType || (hasMinuto && headers.has('equipo'))) return 'evento';

    // roster: has player name + number
    const hasNombre = headers.has('nombre') || headers.has('jugador');
    const hasNumero = headers.has('numero') || headers.has('num') || headers.has('dorsal');
    if (hasNombre && hasNumero) return 'roster';

    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Excel buffer parser
// ─────────────────────────────────────────────────────────────────────────────

export function parseExcelBuffer(buffer: Buffer): {
    rows: ParsedRow[];
    sheetNames: string[];
} {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const rows: ParsedRow[] = [];
    const sheetNames = workbook.SheetNames;

    for (const sheetName of sheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const rawRows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(sheet, {
            defval: null,
            raw: false,
        });

        if (rawRows.length === 0) continue;

        // Normalize all headers
        const normalizedRows = rawRows.map(row => {
            const normalized: Record<string, unknown> = {};
            for (const [key, val] of Object.entries(row)) {
                normalized[normalizeHeader(key)] = val;
            }
            return normalized;
        });

        // Detect row type from first non-empty row headers
        const sampleHeaders = new Set(Object.keys(normalizedRows[0] || {}));
        const rowType = detectRowType(sampleHeaders);
        if (!rowType) continue; // Skip sheets we can't classify

        normalizedRows.forEach((row, idx) => {
            // Skip rows that are completely empty
            const values = Object.values(row).filter(v => v != null && v !== '');
            if (values.length === 0) return;

            rows.push({
                sheet_name: sheetName,
                row_number: idx + 2, // +2: 1-based + header row
                row_type: rowType,
                raw_data: row,
            });
        });
    }

    return { rows, sheetNames };
}

// ─────────────────────────────────────────────────────────────────────────────
// Validation & matching
// ─────────────────────────────────────────────────────────────────────────────

function str(val: unknown): string {
    return val == null ? '' : String(val).trim();
}

function num(val: unknown): number | null {
    const n = Number(val);
    return isNaN(n) ? null : n;
}

function matchPartido(
    row: ParsedRow,
    context: ImportContext
): { matched: Record<string, unknown>; messages: ValidationMessage[] } {
    const messages: ValidationMessage[] = [];
    const matched: Record<string, unknown> = {};

    // Disciplina
    const disciplinaRaw = str(row.raw_data.disciplina || row.raw_data.deporte || row.raw_data.sport);
    if (disciplinaRaw) {
        const disciplinaId = fuzzyMatchDisciplina(disciplinaRaw, context.disciplinas);
        if (disciplinaId) {
            matched.disciplina_id = disciplinaId;
        } else {
            messages.push({ level: 'error', field: 'disciplina', message: `Disciplina no encontrada: "${disciplinaRaw}"` });
        }
    } else {
        messages.push({ level: 'error', field: 'disciplina', message: 'Disciplina vacía' });
    }

    // Teams (optional for fixture import)
    const equipoARaw = str(row.raw_data.equipo_a || row.raw_data.carrera_a || row.raw_data.local);
    const equipoBRaw = str(row.raw_data.equipo_b || row.raw_data.carrera_b || row.raw_data.visitante);

    if (equipoARaw && equipoARaw.toLowerCase() !== 'por definir') {
        const carreraAId = fuzzyMatchCarrera(equipoARaw, context.carreras);
        if (carreraAId) {
            matched.carrera_a_id = carreraAId;
            matched.equipo_a = context.carreras.find(c => c.id === carreraAId)?.nombre ?? equipoARaw;
        } else {
            messages.push({ level: 'warning', field: 'equipo_a', message: `Carrera A no encontrada: "${equipoARaw}" — se usará "Por definir"` });
            matched.equipo_a = 'Por definir';
        }
    } else {
        matched.equipo_a = 'Por definir';
    }

    if (equipoBRaw && equipoBRaw.toLowerCase() !== 'por definir') {
        const carreraBId = fuzzyMatchCarrera(equipoBRaw, context.carreras);
        if (carreraBId) {
            matched.carrera_b_id = carreraBId;
            matched.equipo_b = context.carreras.find(c => c.id === carreraBId)?.nombre ?? equipoBRaw;
        } else {
            messages.push({ level: 'warning', field: 'equipo_b', message: `Carrera B no encontrada: "${equipoBRaw}" — se usará "Por definir"` });
            matched.equipo_b = 'Por definir';
        }
    } else {
        matched.equipo_b = 'Por definir';
    }

    // Fecha
    const fechaRaw = str(row.raw_data.fecha || row.raw_data.date || row.raw_data.hora);
    if (fechaRaw) {
        const parsed = new Date(fechaRaw);
        if (!isNaN(parsed.getTime())) {
            matched.fecha = parsed.toISOString();
        } else {
            messages.push({ level: 'warning', field: 'fecha', message: `Formato de fecha inválido: "${fechaRaw}"` });
        }
    } else {
        messages.push({ level: 'error', field: 'fecha', message: 'Fecha vacía' });
    }

    // Optional fields
    const fase = str(row.raw_data.fase || row.raw_data.ronda || row.raw_data.fase_ronda);
    if (fase) matched.fase = fase;

    const lugar = str(row.raw_data.lugar || row.raw_data.cancha || row.raw_data.sede || row.raw_data.venue);
    if (lugar) matched.lugar = lugar;

    const genero = str(row.raw_data.genero || row.raw_data.categoria);
    if (genero) matched.genero = genero;

    const grupo = str(row.raw_data.grupo || row.raw_data.group);
    if (grupo) matched.grupo = grupo;

    // Marcador (for results import)
    const golesA = num(row.raw_data.goles_a || row.raw_data.marcador_a || row.raw_data.puntos_a);
    const golesB = num(row.raw_data.goles_b || row.raw_data.marcador_b || row.raw_data.puntos_b);
    if (golesA != null && golesB != null) {
        matched.marcador_a = golesA;
        matched.marcador_b = golesB;
    }

    return { matched, messages };
}

function matchEvento(
    row: ParsedRow,
    context: ImportContext,
    resolvedPartidos: Map<string, number>
): { matched: Record<string, unknown>; messages: ValidationMessage[] } {
    const messages: ValidationMessage[] = [];
    const matched: Record<string, unknown> = {};

    // Find partido: try by partido_id first, then by carrera+disciplina+fecha
    const partidoIdRaw = num(row.raw_data.partido_id || row.raw_data.match_id);
    if (partidoIdRaw) {
        matched.partido_id = partidoIdRaw;
    } else {
        // Try to resolve from context
        const fechaRaw = str(row.raw_data.fecha || row.raw_data.date);
        const discRaw = str(row.raw_data.disciplina || row.raw_data.deporte);
        const key = `${normalize(discRaw)}|${fechaRaw.substring(0, 10)}`;
        const resolvedId = resolvedPartidos.get(key);
        if (resolvedId) {
            matched.partido_id = resolvedId;
        } else {
            messages.push({ level: 'warning', field: 'partido_id', message: 'No se pudo asociar a un partido existente' });
        }
    }

    // Jugador
    const nombreJugador = str(row.raw_data.jugador || row.raw_data.nombre || row.raw_data.player);
    const numeroJugador = num(row.raw_data.numero || row.raw_data.num || row.raw_data.dorsal);
    if (nombreJugador) {
        const jugadorId = fuzzyMatchJugador(nombreJugador, numeroJugador, context.jugadores);
        if (jugadorId) {
            matched.jugador_id = jugadorId;
        } else {
            messages.push({ level: 'warning', field: 'jugador', message: `Jugador no encontrado: "${nombreJugador}"` });
        }
    }

    // Tipo evento
    const tipo = str(row.raw_data.tipo_evento || row.raw_data.tipo || row.raw_data.evento);
    if (tipo) matched.tipo_evento = normalize(tipo).replace(/\s/g, '_');
    else messages.push({ level: 'error', field: 'tipo_evento', message: 'Tipo de evento vacío' });

    // Minuto
    const minuto = num(row.raw_data.minuto || row.raw_data.min);
    if (minuto != null) matched.minuto = minuto;

    // Equipo
    const equipo = str(row.raw_data.equipo || row.raw_data.team);
    if (equipo) matched.equipo = equipo;

    return { matched, messages };
}

function matchRoster(
    row: ParsedRow,
    context: ImportContext,
    resolvedPartidos: Map<string, number>
): { matched: Record<string, unknown>; messages: ValidationMessage[] } {
    const messages: ValidationMessage[] = [];
    const matched: Record<string, unknown> = {};

    // Find partido
    const partidoIdRaw = num(row.raw_data.partido_id || row.raw_data.match_id);
    if (partidoIdRaw) {
        matched.partido_id = partidoIdRaw;
    } else {
        const fechaRaw = str(row.raw_data.fecha || row.raw_data.date);
        const discRaw = str(row.raw_data.disciplina || row.raw_data.deporte);
        const key = `${normalize(discRaw)}|${fechaRaw.substring(0, 10)}`;
        const resolvedId = resolvedPartidos.get(key);
        if (resolvedId) matched.partido_id = resolvedId;
        else messages.push({ level: 'warning', field: 'partido_id', message: 'No se pudo asociar a un partido' });
    }

    // Jugador
    const nombre = str(row.raw_data.nombre || row.raw_data.jugador || row.raw_data.player);
    const numero = num(row.raw_data.numero || row.raw_data.num || row.raw_data.dorsal);
    if (!nombre) {
        messages.push({ level: 'error', field: 'nombre', message: 'Nombre del jugador vacío' });
    } else {
        const jugadorId = fuzzyMatchJugador(nombre, numero, context.jugadores);
        if (jugadorId) {
            matched.jugador_id = jugadorId;
        } else {
            // New player — will be created on commit
            matched.create_jugador = true;
            matched.nombre = nombre;
            matched.numero = numero;
            messages.push({ level: 'warning', field: 'jugador', message: `Jugador nuevo, se creará al confirmar: "${nombre}"` });
        }
    }

    // equipo_a_or_b
    const equipoSide = str(row.raw_data.equipo || row.raw_data.equipo_a_or_b || row.raw_data.lado);
    if (equipoSide) matched.equipo_a_or_b = equipoSide;
    else messages.push({ level: 'warning', field: 'equipo_a_or_b', message: 'Lado del equipo no especificado' });

    return { matched, messages };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function validateAndMatchRows(
    rows: ParsedRow[],
    context: ImportContext
): MatchedRow[] {
    // Build a lookup map for partidos by (disciplina+fecha) for event/roster matching
    const resolvedPartidos = new Map<string, number>();
    for (const p of context.partidos) {
        const disc = context.disciplinas.find(d => d.id === p.disciplina_id);
        if (disc && p.fecha) {
            const key = `${normalize(disc.name)}|${p.fecha.substring(0, 10)}`;
            resolvedPartidos.set(key, p.id);
        }
    }

    return rows.map(row => {
        let matched: Record<string, unknown> = {};
        let messages: ValidationMessage[] = [];

        if (row.row_type === 'partido') {
            ({ matched, messages } = matchPartido(row, context));
        } else if (row.row_type === 'evento') {
            ({ matched, messages } = matchEvento(row, context, resolvedPartidos));
        } else if (row.row_type === 'roster') {
            ({ matched, messages } = matchRoster(row, context, resolvedPartidos));
        }

        const hasErrors = messages.some(m => m.level === 'error');
        const hasWarnings = messages.some(m => m.level === 'warning');
        const status = hasErrors ? 'error' : hasWarnings ? 'warning' : 'ok';

        return { ...row, matched_data: matched, validation_status: status, validation_messages: messages };
    });
}
