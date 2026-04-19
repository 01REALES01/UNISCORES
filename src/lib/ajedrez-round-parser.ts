/**
 * Parser opcional para Excel de una sola ronda de ajedrez cuando no hay hoja
 * "POR DIA GENERAL": primera hoja con cabeceras que incluyan pares blanco/negro.
 *
 * Formatos soportados:
 * - Mesa | Blancas | Negras | Fecha | Hora | Lugar
 * - Export tipo Swiss: fila "N. Ronda el YYYY/MM/DD a las HH:MM ..." + columnas **White** / **Black**,
 *   opcional **M.** (mesa), **Resultado** ("1 - 0", "0 - 1", tablas).
 * - Nombres "Apellido, Nombre" se normalizan a "Nombre Apellido" para cruzar con `jugadores`.
 */
import * as XLSX from 'xlsx';
import type { ScheduleMatch } from '@/lib/schedule-parser';

function norm(s: unknown): string {
  return String(s ?? '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function findCol(headers: string[], ...candidates: string[]): number {
  const H = headers.map(norm);
  for (const c of candidates) {
    const n = norm(c);
    const i = H.findIndex((h) => h === n || h.includes(n));
    if (i >= 0) return i;
  }
  return -1;
}

/** "Agamez Madera, Kennier Andres" → "Kennier Andres Agamez Madera" */
export function normalizeSwissPlayerName(raw: string): string {
  const t = String(raw ?? '').trim().replace(/\s+/g, ' ');
  const comma = t.indexOf(',');
  if (comma > 0) {
    const lastPart = t.slice(0, comma).trim();
    const firstPart = t.slice(comma + 1).trim();
    if (firstPart) return `${firstPart} ${lastPart}`.replace(/\s+/g, ' ');
  }
  return t;
}

/** "1 - 0" / "0 - 1" / medias tablas */
function parseResultadoCelda(raw: unknown): 'victoria_a' | 'victoria_b' | 'empate' | null {
  let s = String(raw ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/½/g, '0.5')
    .replace(/1\/2/gi, '0.5');
  if (!s) return null;
  const m = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)/);
  if (!m) return null;
  const a = parseFloat(m[1]);
  const b = parseFloat(m[2]);
  if (a === 1 && b === 0) return 'victoria_a';
  if (a === 0 && b === 1) return 'victoria_b';
  if (a === 0.5 && b === 0.5) return 'empate';
  return null;
}

/** Ej. "1. Ronda el 2026/04/17 a las 03:00 p.m." */
function parseRondaBannerLine(cell: unknown): { numero?: number; scheduled_at?: string } {
  const s = String(cell ?? '').trim();
  if (!s.toLowerCase().includes('ronda')) return {};
  const dateM = s.match(/(\d+)\s*\.\s*Ronda\s+el\s+(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/i);
  if (!dateM) return {};
  const numero = parseInt(dateM[1], 10);
  const y = parseInt(dateM[2], 10);
  const mo = parseInt(dateM[3], 10);
  const d = parseInt(dateM[4], 10);
  const pad = (n: number) => String(n).padStart(2, '0');
  let hh = 15;
  let mm = 0;
  const tm = s.match(/(\d{1,2}):(\d{2})/);
  if (tm) {
    hh = parseInt(tm[1], 10);
    mm = parseInt(tm[2], 10);
    if (/\bp\.?\s*m\.?\b/i.test(s) && hh < 12) hh += 12;
    if (/\ba\.?\s*m\.?\b/i.test(s) && hh === 12) hh = 0;
  }
  const scheduled_at = `${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00-05:00`;
  return { numero, scheduled_at };
}

/** Construye ISO COT si hay fecha+hora; si no, usa fecha por defecto. */
function buildTs(dateCell: unknown, timeCell: unknown, defaultIso: string): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  let y = 2026,
    mo = 4,
    d = 17,
    hh = 9,
    mm = 0;

  if (dateCell instanceof Date && !Number.isNaN(dateCell.getTime())) {
    y = dateCell.getFullYear();
    mo = dateCell.getMonth() + 1;
    d = dateCell.getDate();
  } else if (typeof dateCell === 'string' && dateCell.trim()) {
    const m = dateCell.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
    if (m) {
      d = parseInt(m[1], 10);
      mo = parseInt(m[2], 10);
      y = parseInt(m[3], 10);
      if (y < 100) y += 2000;
    }
  }

  if (timeCell instanceof Date && !Number.isNaN(timeCell.getTime())) {
    hh = timeCell.getHours();
    mm = timeCell.getMinutes();
  } else if (typeof timeCell === 'string' && timeCell.trim()) {
    const t = timeCell.match(/(\d{1,2}):(\d{2})/);
    if (t) {
      hh = parseInt(t[1], 10);
      mm = parseInt(t[2], 10);
    }
  }

  return `${y}-${pad(mo)}-${pad(d)}T${pad(hh)}:${pad(mm)}:00-05:00`;
}

/**
 * Intenta extraer partidos tipo calendario desde una tabla simple.
 * Si no detecta cabeceras Blancas/Negras, devuelve [].
 */
export function parseAjedrezSimpleTable(
  buffer: Buffer,
  opts: {
    genero: 'masculino' | 'femenino' | 'mixto';
    roundLabel: string;
    defaultVenue: string;
    defaultTimestamp: string;
  }
): { matches: ScheduleMatch[]; errors: Array<{ sheet: string; row: number; message: string }> } {
  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true, defval: '' } as XLSX.ParsingOptions);
  const matches: ScheduleMatch[] = [];
  const errors: Array<{ sheet: string; row: number; message: string }> = [];

  const sheetName = wb.SheetNames[0] || 'Hoja1';
  const sheet = wb.Sheets[sheetName];
  if (!sheet) return { matches, errors };

  const rows: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: false });
  const rowsRaw: unknown[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '', raw: true });
  const merged = rows.map((row, ri) => {
    const raw = rowsRaw[ri] ?? [];
    return row.map((v, ci) => {
      if (raw[ci] instanceof Date) return raw[ci];
      return v;
    });
  });

  let headerRowIdx = -1;
  let iBlanco = -1;
  let iNegro = -1;
  let iMesa = -1;
  let iFecha = -1;
  let iHora = -1;
  let iLugar = -1;
  let iResultado = -1;

  let bannerScheduledAt: string | undefined;
  for (let r = 0; r < Math.min(merged.length, 30); r++) {
    const row = merged[r] as unknown[];
    const line = row.map((c) => String(c ?? '').trim()).filter(Boolean).join(' ');
    const meta = parseRondaBannerLine(line);
    if (meta.scheduled_at) {
      bannerScheduledAt = meta.scheduled_at;
      break;
    }
    const single = parseRondaBannerLine(row[0]);
    if (single.scheduled_at) {
      bannerScheduledAt = single.scheduled_at;
      break;
    }
  }

  for (let r = 0; r < Math.min(merged.length, 60); r++) {
    const row = merged[r] as unknown[];
    const headers = row.map((c) => String(c ?? '').trim());
    if (headers.every((h) => !h)) continue;

    const hb = findCol(headers, 'BLANCAS', 'BLANCO', 'WHITE', 'JUGADOR_A', 'JUGADOR A');
    const hn = findCol(headers, 'NEGRAS', 'NEGRO', 'BLACK', 'JUGADOR_B', 'JUGADOR B');
    if (hb >= 0 && hn >= 0) {
      headerRowIdx = r;
      iBlanco = hb;
      iNegro = hn;
      iMesa = findCol(headers, 'M.', 'MESA', 'BOARD', 'TABLERO', 'TAB', 'Nº', 'N°');
      iFecha = findCol(headers, 'FECHA', 'DATE');
      iHora = findCol(headers, 'HORA', 'TIME', 'HORA INICIO');
      iLugar = findCol(headers, 'LUGAR', 'SEDE', 'VENUE', 'SITIO');
      iResultado = findCol(headers, 'RESULTADO', 'RESULT', 'OUTCOME');
      break;
    }
  }

  if (headerRowIdx < 0) {
    return { matches, errors };
  }

  const headersRow = (merged[headerRowIdx] as unknown[]).map((c) => String(c ?? '').trim());
  if (iMesa < 0) {
    const idx = headersRow.findIndex((h) => {
      const n = norm(h);
      return n === 'M' || n === 'M.';
    });
    if (idx >= 0) iMesa = idx;
  }

  const defaultTs = bannerScheduledAt ?? opts.defaultTimestamp;

  const gen: 'masculino' | 'femenino' =
    opts.genero === 'mixto' ? 'masculino' : opts.genero;

  for (let r = headerRowIdx + 1; r < merged.length; r++) {
    const row = merged[r] as unknown[];
    if (!row || row.every((c) => !String(c ?? '').trim())) continue;

    const rawA = String(row[iBlanco] ?? '').trim();
    const rawB = String(row[iNegro] ?? '').trim();
    const slotA = normalizeSwissPlayerName(rawA);
    const slotB = normalizeSwissPlayerName(rawB);
    if (!slotA || !slotB) {
      errors.push({ sheet: sheetName, row: r, message: 'Fila sin jugador blancas/negras' });
      continue;
    }

    const mesa = iMesa >= 0 ? String(row[iMesa] ?? '').trim() : '';
    const venue =
      iLugar >= 0 && String(row[iLugar] ?? '').trim()
        ? String(row[iLugar]).trim()
        : opts.defaultVenue;
    const fechaCell = iFecha >= 0 ? row[iFecha] : undefined;
    const horaCell = iHora >= 0 ? row[iHora] : undefined;
    const scheduled_at =
      fechaCell || horaCell ? buildTs(fechaCell, horaCell, defaultTs) : defaultTs;

    const group = mesa || String(r - headerRowIdx);

    const resCell = iResultado >= 0 ? parseResultadoCelda(row[iResultado]) : null;
    const matchRow: ScheduleMatch = {
      sport: 'Ajedrez',
      genero: gen,
      round: opts.roundLabel,
      group_column_header: 'MESA',
      slot_a: slotA,
      slot_b: slotB,
      group_or_bracket: group,
      venue,
      scheduled_at,
      sheet: sheetName,
      row: r,
    };
    if (resCell) matchRow.ajedrez_resultado = resCell;
    matches.push(matchRow);
  }

  return { matches, errors };
}
