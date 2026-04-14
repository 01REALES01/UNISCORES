import type { SupabaseClient } from '@supabase/supabase-js';

/** Normalize for loose substring checks (Spanish accents, case). */
export function normalizeNombreLoose(s: string | null | undefined): string {
  if (!s) return '';
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

type CarreraRow = { id: number; nombre: string; escudo_url?: string | null };

/**
 * When a carrera plays under a combined "equipo" (delegación) that has its own shield,
 * use that shield for the carrera display (e.g. Negocios Internacionales ↔ ESCUELA DE NEGOCIOS).
 */
const RULES: ReadonlyArray<{
  /** Carrera display name must contain this (after normalize). */
  carreraContains: string;
  /** Delegación nombre ILIKE pattern (single % wildcard chunk is enough). */
  delegacionIlike: string;
}> = [
  // Intentionally empty: pulling delegaciones.escudo_url here overwrote Negocios Internacionales
  // with a wrong shield when the delegación row was backfilled from carrera_ids[1] (e.g. Administración).
  // Match UIs now prefer EQUIPO_NOMBRE_TO_CARRERAS via match-carrera-shields (see bestEscudoForSide).
];

let cachedDelegacionUrl: Map<string, string | null> = new Map();

async function fetchDelegacionEscudoUrl(
  client: SupabaseClient,
  ilikePattern: string
): Promise<string | null> {
  const key = ilikePattern;
  if (cachedDelegacionUrl.has(key)) {
    const v = cachedDelegacionUrl.get(key);
    return v === undefined ? null : v;
  }
  const { data, error } = await client
    .from('delegaciones')
    .select('escudo_url')
    .not('escudo_url', 'is', null)
    .ilike('nombre', ilikePattern)
    .order('id', { ascending: true })
    .limit(1);

  if (error) {
    console.warn('[carrera-delegacion-escudo-alias] delegaciones query failed:', error.message);
    cachedDelegacionUrl.set(key, null);
    return null;
  }
  const url = (data?.[0] as { escudo_url?: string | null } | undefined)?.escudo_url?.trim() || null;
  cachedDelegacionUrl.set(key, url);
  return url;
}

/** Clears in-memory cache (e.g. after tests). */
export function clearDelegacionEscudoAliasCache(): void {
  cachedDelegacionUrl = new Map();
}

/**
 * For each matching carrera row, if the linked delegación rule returns an escudo, set map[id] to it
 * (overrides an existing carrera escudo so it always matches the equipo shield).
 */
export async function applyCarreraDelegacionEscudoAliases(
  client: SupabaseClient,
  rows: CarreraRow[],
  escudoByCarreraId: Map<number, string>
): Promise<void> {
  for (const row of rows) {
    const n = normalizeNombreLoose(row.nombre);
    for (const rule of RULES) {
      if (!n.includes(rule.carreraContains)) continue;
      const fromDel = await fetchDelegacionEscudoUrl(client, rule.delegacionIlike);
      if (fromDel) escudoByCarreraId.set(row.id, fromDel);
      break;
    }
  }
}

/** Single carrera (profile page): overlay escudo from delegación alias when applicable. */
export async function overlayCarreraEscudoFromDelegationAlias<T extends CarreraRow>(
  client: SupabaseClient,
  carrera: T
): Promise<T> {
  const map = new Map<number, string>();
  const existing = carrera.escudo_url?.trim();
  if (existing) map.set(carrera.id, existing);
  await applyCarreraDelegacionEscudoAliases(client, [carrera], map);
  const next = map.get(carrera.id);
  if (!next || next === existing) return carrera;
  return { ...carrera, escudo_url: next };
}
