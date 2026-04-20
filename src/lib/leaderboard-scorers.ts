/**
 * Agregación de goles / puntos desde olympics_eventos (misma lógica que view_top_scorers).
 * Centralizado para /lideres y pruebas.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const PAGE = 1000;

/** Todas las filas de olympics_eventos (PostgREST limita a 1000 por defecto si no paginas). */
export async function fetchAllOlympicsEventosRows(
  supabase: SupabaseClient,
  select: string
): Promise<Record<string, unknown>[]> {
  const rows: Record<string, unknown>[] = [];
  let from = 0;
  while (true) {
    const { data, error } = await supabase
      .from('olympics_eventos')
      .select(select)
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) {
      console.warn('[fetchAllOlympicsEventosRows]', error.message);
      break;
    }
    if (!data?.length) break;
    rows.push(...(data as unknown as Record<string, unknown>[]));
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

export const SCORING_EVENT_TYPES = [
  'gol',
  'punto',
  'punto_1',
  'punto_2',
  'punto_3',
  'anotacion',
] as const;

export type ScoringEventType = (typeof SCORING_EVENT_TYPES)[number];

/** Puntos que aporta cada evento al ranking (baloncesto: 1/2/3; fútbol: gol=1). */
export function puntosPorTipoEvento(tipo: string): number {
  const t = (tipo || '').toLowerCase();
  if (t === 'gol') return 1;
  if (t === 'punto') return 1;
  if (t === 'punto_1') return 1;
  if (t === 'punto_2') return 2;
  if (t === 'punto_3') return 3;
  if (t === 'anotacion') return 2;
  return 0;
}

export type JugadorRow = {
  id: number;
  nombre: string;
  numero: number | null;
  profile_id: string | null;
  carrera_id?: number | null;
  genero: string | null;
};

/**
 * Une filas de `jugadores` que son la misma persona (doble alta en rooster):
 * 1) mismo `profile_id` → misma clave
 * 2) sin profile: mismo `carrera` + `nombre` + `género` + `disciplina` (evita 3+3 duplicado)
 * 3) resto: id estable (no fusionar)
 */
export function getScorerLeaderboardMergeKey(
  j: {
    id: number;
    nombre: string;
    profile_id: string | null;
    carrera_id?: number | null;
    genero: string | null;
  },
  disciplina: string,
  /** Género del partido: prioridad sobre el campo del jugador (misma carrera, torneo fem/masc). */
  generoPartido?: string | null
): string {
  const d = (disciplina || '').trim();
  const g = (generoPartido || j.genero || 'masculino').toLowerCase();
  if (j.profile_id) {
    return `p|${j.profile_id}|${d}`;
  }
  if (j.carrera_id != null && (j.nombre || '').trim()) {
    const n = j.nombre
      .toLowerCase()
      .trim()
      .replace(/\s+/g, ' ');
    return `c|${j.carrera_id}|${n}|${g}|${d}`;
  }
  return `i|${j.id}|${d}`;
}

/** Bota de oro en /estadisticas: misma clave aunque el partido sea Fútbol o Futsal. */
export const BOTA_FUTBOL_FUTSAL_DISC = '__BotaFutbolFutsal__';

export type AggregatedScorer = {
  jugador_id: number;
  nombre: string;
  numero: number | null;
  profile_id: string | null;
  disciplina: string;
  genero: string;
  goles: number;
  puntos_totales: number;
  partidos_jugados: number;
  mejor_partido: number;
};

export type RawScoringEvent = {
  tipo_evento: string;
  partido_id: number;
  jugador_id: number | null;
  jugador_id_normalized: number | null;
  /** PostgREST puede devolver objeto o array de 1 elemento en !inner */
  partidos:
    | { estado: string; genero?: string | null; disciplinas: { name: string } | { name: string }[] | null }
    | { estado: string; genero?: string | null; disciplinas: { name: string } | { name: string }[] | null }[]
    | null;
};

/** Eventos de canasta / gol con partido finalizado (para /lideres). */
export async function fetchScoringEventsForLeaderboard(
  supabase: SupabaseClient
): Promise<RawScoringEvent[]> {
  const rows: RawScoringEvent[] = [];
  let from = 0;
  while (true) {
    const { data: page, error } = await supabase
      .from('olympics_eventos')
      .select(
        `
        tipo_evento,
        partido_id,
        jugador_id,
        jugador_id_normalized,
        partidos!inner (
          estado,
          genero,
          disciplinas ( name )
        )
      `
      )
      .in('tipo_evento', [...SCORING_EVENT_TYPES])
      .eq('partidos.estado', 'finalizado')
      .order('id', { ascending: true })
      .range(from, from + PAGE - 1);

    if (error) {
      console.warn('[fetchScoringEventsForLeaderboard]', error.message);
      break;
    }
    if (!page?.length) break;
    rows.push(...(page as unknown as RawScoringEvent[]));
    if (page.length < PAGE) break;
    from += PAGE;
  }
  return rows;
}

function normalizePartido(
  p: RawScoringEvent['partidos']
):
  | { estado: string; genero?: string | null; disciplinas: { name: string } | { name: string }[] | null }
  | null {
  if (p == null) return null;
  const row = Array.isArray(p) ? p[0] : p;
  return row ?? null;
}

function disciplinaNombre(p: RawScoringEvent['partidos']): string {
  const row = normalizePartido(p);
  const d = row?.disciplinas;
  if (!d) return 'Desconocido';
  const nameRow = Array.isArray(d) ? d[0] : d;
  return nameRow?.name || 'Desconocido';
}

/**
 * Une eventos paginados + filas de jugadores y devuelve el ranking.
 */
export function aggregateScorersFromEvents(
  eventos: RawScoringEvent[],
  jugadoresById: Map<number, JugadorRow>
): AggregatedScorer[] {
  const byKey = new Map<
    string,
    {
      jugador_id: number;
      nombre: string;
      numero: number | null;
      profile_id: string | null;
      disciplina: string;
      genero: string;
      goles: number;
      puntos_totales: number;
      partidos: Set<number>;
      /** partido_id -> puntos en ese partido */
      puntosPorPartido: Map<number, number>;
    }
  >();

  for (const e of eventos) {
    const partido = normalizePartido(e.partidos);
    if (!partido || partido.estado !== 'finalizado') continue;
    const ptsTipo = puntosPorTipoEvento(e.tipo_evento);
    if (ptsTipo <= 0) continue;

    const jid = e.jugador_id_normalized ?? e.jugador_id;
    if (jid == null) continue;

    const j = jugadoresById.get(jid);
    if (!j) continue;

    const pRow = normalizePartido(e.partidos);
    const generoP = pRow?.genero ?? null;
    const disc = disciplinaNombre(e.partidos);
    const key = getScorerLeaderboardMergeKey(
      {
        id: j.id,
        nombre: j.nombre,
        profile_id: j.profile_id,
        carrera_id: j.carrera_id,
        genero: j.genero,
      },
      disc,
      generoP
    );

    if (!byKey.has(key)) {
      byKey.set(key, {
        jugador_id: j.id,
        nombre: j.nombre,
        numero: j.numero,
        profile_id: j.profile_id,
        disciplina: disc,
        genero: (generoP || j.genero || 'masculino').toLowerCase(),
        goles: 0,
        puntos_totales: 0,
        partidos: new Set(),
        puntosPorPartido: new Map(),
      });
    }

    const row = byKey.get(key)!;
    if (j.id < row.jugador_id) {
      row.jugador_id = j.id;
      row.nombre = j.nombre;
      row.numero = j.numero;
    }
    if (j.profile_id) row.profile_id = j.profile_id;
    if (generoP) row.genero = generoP.toLowerCase();
    else if (!row.genero && j.genero) row.genero = (j.genero || 'masculino').toLowerCase();

    const inc = ptsTipo;
    if (e.tipo_evento === 'gol') row.goles++;
    row.puntos_totales += inc;
    row.partidos.add(e.partido_id);

    const prev = row.puntosPorPartido.get(e.partido_id) ?? 0;
    row.puntosPorPartido.set(e.partido_id, prev + inc);
  }

  const out: AggregatedScorer[] = [];
  for (const row of byKey.values()) {
    let mejor = 0;
    for (const v of row.puntosPorPartido.values()) {
      if (v > mejor) mejor = v;
    }
    out.push({
      jugador_id: row.jugador_id,
      nombre: row.nombre,
      numero: row.numero,
      profile_id: row.profile_id,
      disciplina: row.disciplina,
      genero: row.genero,
      goles: row.goles,
      puntos_totales: row.puntos_totales,
      partidos_jugados: row.partidos.size,
      mejor_partido: mejor,
    });
  }

  return out.filter((s) => s.puntos_totales > 0).sort((a, b) => b.puntos_totales - a.puntos_totales);
}
