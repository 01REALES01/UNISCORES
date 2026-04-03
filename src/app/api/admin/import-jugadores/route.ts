// POST /api/admin/import-jugadores
// Parse Excel file, validate carreras + disciplinas, check profiles, return preview rows

import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function normalize(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ');
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
}

function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshtein(a, b) / maxLen;
}

// ─────────────────────────────────────────────────────────────────────────────
// Alias maps — se aplican ANTES del fuzzy match para corregir términos comunes
// que engañarían al algoritmo de similitud
// ─────────────────────────────────────────────────────────────────────────────

// Claves: versión normalizada del input del Excel → nombre exacto en DB
const CARRERA_ALIASES: Record<string, string> = {
  'colaborador':  'Funcionario',
  'colaboradora': 'Funcionario',
  'funcionario':  'Funcionario',
  'funcionaria':  'Funcionario',
};

const DISCIPLINA_ALIASES: Record<string, string> = {
  'tenis de campo': 'Tenis',
  'tenis campo':    'Tenis',
  'tennis':         'Tenis',
  'ping pong':      'Tenis de Mesa',
  'pingpong':       'Tenis de Mesa',
  'futbol':         'Fútbol',
  'soccer':         'Fútbol',
  'basketball':     'Baloncesto',
  'basquet':        'Baloncesto',
  'volleyball':     'Voleibol',
  'volley':         'Voleibol',
  'natacion':       'Natación',
  'swimming':       'Natación',
  'ajedrez':        'Ajedrez',
  'chess':          'Ajedrez',
};

function parseGenero(rama: string): 'masculino' | 'femenino' | 'mixto' | null {
  const n = normalize(rama);
  if (n.includes('femen') || n === 'f') return 'femenino';
  if (n.includes('mascul') || n === 'm') return 'masculino';
  if (n.includes('mixto')) return 'mixto';
  return null;
}

function parseSexo(sexo: string): 'M' | 'F' | null {
  const v = sexo.trim().toUpperCase();
  if (v === 'M' || v === 'H') return 'M';   // H = Hombre → M
  if (v === 'F') return 'F';
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ParsedJugador {
  nombre: string;
  carrera_input: string;
  carrera_id: number | null;
  carrera_matched: string | null;
  carrera_confidence: number;
  disciplina_input: string | null;
  disciplina_id: number | null;
  disciplina_matched: string | null;
  disciplina_confidence: number;
  genero: 'masculino' | 'femenino' | 'mixto' | null;
  sexo: 'M' | 'F' | null;
  numero: number | null;
  email: string | null;
  profile_id: string | null;
  validation_status: 'ok' | 'warning' | 'error';
  validation_messages: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Fetch lookup tables in parallel
    const [carrerasRes, disciplinasRes] = await Promise.all([
      supabase.from('carreras').select('id, nombre'),
      supabase.from('disciplinas').select('id, name'),
    ]);

    if (!carrerasRes.data || !disciplinasRes.data) {
      return NextResponse.json({ error: 'Error cargando datos de referencia' }, { status: 500 });
    }

    const carreras = carrerasRes.data;
    const disciplinas = disciplinasRes.data;

    // Parse file
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });

    // Find target sheet: prefer match on "inscritos" or "relacion", fallback to last sheet
    const TARGET_KEYWORDS = ['inscritos', 'relacion', 'roster', 'jugadores', 'deportistas'];
    const sheetName =
      workbook.SheetNames.find(n =>
        TARGET_KEYWORDS.some(kw => normalize(n).includes(kw))
      ) || workbook.SheetNames[workbook.SheetNames.length - 1];

    if (!sheetName) return NextResponse.json({ error: 'Empty workbook' }, { status: 400 });

    const worksheet = workbook.Sheets[sheetName];
    const rows: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

    if (rows.length === 0) return NextResponse.json({ error: 'No data rows found' }, { status: 400 });

    // Map headers
    const rawHeaders = Object.keys(rows[0] || {});
    const headerMap: Record<string, string> = {};
    for (const h of rawHeaders) {
      const norm = normalize(h);
      if (norm.match(/^(nombre|name|deportista)$/)) headerMap['nombre'] = h;
      if (norm.match(/^(carrera|programa|program)$/)) headerMap['carrera'] = h;
      if (norm.match(/^(numero|num|camiseta|jersey)$/)) headerMap['numero'] = h;
      if (norm.match(/^(email|correo)$/)) headerMap['email'] = h;
      if (norm.match(/^(deporte|sport|disciplina)$/)) headerMap['deporte'] = h;
      if (norm.match(/^(rama|genero|gender)$/)) headerMap['rama'] = h;
      if (norm.match(/^(sexo|sex|genero_personal)$/)) headerMap['sexo'] = h;
    }

    if (!headerMap['nombre'] || !headerMap['carrera']) {
      return NextResponse.json({ error: 'Columnas requeridas: nombre, carrera (o programa)' }, { status: 400 });
    }

    // Fetch ALL profiles once — use lowercase comparison, never normalize emails
    // (normalize() strips @ and . which breaks email matching)
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, email')
      .limit(10000);

    const profileMap = new Map(
      (profiles || [])
        .filter(p => p.email)
        .map(p => [p.email!.toLowerCase().trim(), p.id as string])
    );

    // Parse & validate each row
    const parsedRows: ParsedJugador[] = rows.map((row) => {
      const nombre = (row[headerMap['nombre'] as string] as string || '').trim();
      const carreraInput = (row[headerMap['carrera'] as string] as string || '').trim();
      const deporteInput = headerMap['deporte'] ? (row[headerMap['deporte']] as string || '').trim() : null;
      const ramaInput = headerMap['rama'] ? (row[headerMap['rama']] as string || '').trim() : null;
      const sexoInput = headerMap['sexo'] ? (row[headerMap['sexo']] as string || '').trim() : null;
      const numeroRaw = row[headerMap['numero'] as string];
      const emailInput = headerMap['email'] ? (row[headerMap['email']] as string || '').trim().toLowerCase() : '';

      const messages: string[] = [];
      let status: 'ok' | 'warning' | 'error' = 'ok';

      // ── Nombre ──
      if (!nombre) {
        messages.push('Nombre requerido');
        status = 'error';
      }

      // ── Carrera fuzzy match ──
      let carreraId: number | null = null;
      let carreraMatched: string | null = null;
      let carreraConf = 0;
      const normCarrera = normalize(carreraInput);
      // Apply alias: if exact normalized match exists, use canonical name for lookup
      const carreraLookup = CARRERA_ALIASES[normCarrera] || carreraInput;
      let bestCarrera: { id: number; nombre: string; sim: number } | null = null;
      for (const c of carreras) {
        const sim = similarity(normalize(carreraLookup), normalize(c.nombre));
        if (!bestCarrera || sim > bestCarrera.sim) bestCarrera = { id: c.id, nombre: c.nombre, sim };
      }
      if (bestCarrera && bestCarrera.sim >= 0.72) {
        carreraId = bestCarrera.id;
        carreraMatched = bestCarrera.nombre;
        carreraConf = bestCarrera.sim;
      } else if (bestCarrera && bestCarrera.sim >= 0.50) {
        carreraId = bestCarrera.id;
        carreraMatched = bestCarrera.nombre;
        carreraConf = bestCarrera.sim;
        messages.push(`Carrera aproximada: "${carreraInput}" → "${bestCarrera.nombre}"`);
        status = 'warning';
      } else {
        messages.push(`Carrera no encontrada: "${carreraInput}"`);
        status = 'error';
      }

      // ── Disciplina fuzzy match ──
      let disciplinaId: number | null = null;
      let disciplinaMatched: string | null = null;
      let disciplinaConf = 0;
      if (deporteInput) {
        const normDeporte = normalize(deporteInput);
        // Apply alias: catches "tenis de campo" → "Tenis" before fuzzy comparison
        const deporteLookup = DISCIPLINA_ALIASES[normDeporte] || deporteInput;
        let bestDisc: { id: number; name: string; sim: number } | null = null;
        for (const d of disciplinas) {
          const sim = similarity(normalize(deporteLookup), normalize(d.name));
          if (!bestDisc || sim > bestDisc.sim) bestDisc = { id: d.id, name: d.name, sim };
        }
        if (bestDisc && bestDisc.sim >= 0.65) {
          disciplinaId = bestDisc.id;
          disciplinaMatched = bestDisc.name;
          disciplinaConf = bestDisc.sim;
        } else if (bestDisc && bestDisc.sim >= 0.45) {
          disciplinaId = bestDisc.id;
          disciplinaMatched = bestDisc.name;
          disciplinaConf = bestDisc.sim;
          messages.push(`Deporte aproximado: "${deporteInput}" → "${bestDisc.name}"`);
          if (status === 'ok') status = 'warning';
        } else {
          messages.push(`Deporte no encontrado: "${deporteInput}"`);
          if (status === 'ok') status = 'warning';
        }
      }

      // ── Rama / Sexo ──
      const genero = ramaInput ? parseGenero(ramaInput) : null;
      if (ramaInput && !genero) {
        messages.push(`Rama no reconocida: "${ramaInput}"`);
        if (status === 'ok') status = 'warning';
      }

      const sexo = sexoInput ? parseSexo(sexoInput) : null;

      // ── Numero ──
      let numero: number | null = null;
      if (numeroRaw !== undefined && numeroRaw !== '') {
        const n = parseInt(String(numeroRaw), 10);
        if (!isNaN(n)) numero = n;
      }

      // ── Email / Profile ──
      let profileId: string | null = null;
      if (emailInput) {
        profileId = profileMap.get(emailInput.toLowerCase().trim()) || null;
        if (!profileId) {
          messages.push(`Email no registrado aún`);
          if (status === 'ok') status = 'warning';
        }
      }

      return {
        nombre,
        carrera_input: carreraInput,
        carrera_id: carreraId,
        carrera_matched: carreraMatched,
        carrera_confidence: carreraConf,
        disciplina_input: deporteInput,
        disciplina_id: disciplinaId,
        disciplina_matched: disciplinaMatched,
        disciplina_confidence: disciplinaConf,
        genero,
        sexo,
        numero,
        email: emailInput || null,
        profile_id: profileId,
        validation_status: status,
        validation_messages: messages,
      };
    });

    return NextResponse.json({
      rows: parsedRows,
      sheet_used: sheetName,
      total: parsedRows.length,
      ok: parsedRows.filter(r => r.validation_status === 'ok').length,
      warning: parsedRows.filter(r => r.validation_status === 'warning').length,
      error: parsedRows.filter(r => r.validation_status === 'error').length,
    });
  } catch (err: any) {
    console.error('[import-jugadores] Error:', err);
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
