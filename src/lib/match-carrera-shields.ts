import type { SupabaseClient } from '@supabase/supabase-js';
import type { PartidoWithRelations } from '@/modules/matches/types';

/** IDs to try for a side’s shield: singular FK first, then fusion array (deduped). */
function orderedCarreraIdsForSide(
  partido: Pick<
    PartidoWithRelations,
    'carrera_a_id' | 'carrera_b_id' | 'carrera_a_ids' | 'carrera_b_ids'
  >,
  side: 'a' | 'b'
): number[] {
  const singular = side === 'a' ? partido.carrera_a_id : partido.carrera_b_id;
  const plural = side === 'a' ? partido.carrera_a_ids : partido.carrera_b_ids;
  const out: number[] = [];
  if (singular != null) out.push(singular);
  if (Array.isArray(plural)) {
    for (const id of plural) {
      if (id != null && !out.includes(id)) out.push(id);
    }
  }
  return out;
}

function bestEscudoForSide(
  partido: PartidoWithRelations,
  side: 'a' | 'b',
  escudoByCarreraId: ReadonlyMap<number, string | null | undefined>
): string | undefined {
  const joined = side === 'a' ? partido.carrera_a : partido.carrera_b;
  const fromJoin = joined?.escudo_url;
  if (fromJoin) return fromJoin;

  for (const id of orderedCarreraIdsForSide(partido, side)) {
    const u = escudoByCarreraId.get(id);
    if (u) return u;
  }
  return undefined;
}

export function collectCarreraIdsForShieldEnrichment(
  rows: PartidoWithRelations[]
): number[] {
  const s = new Set<number>();
  for (const p of rows) {
    orderedCarreraIdsForSide(p, 'a').forEach((id) => s.add(id));
    orderedCarreraIdsForSide(p, 'b').forEach((id) => s.add(id));
  }
  return [...s];
}

export async function fetchCarreraEscudoMap(
  client: SupabaseClient,
  ids: number[]
): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  if (ids.length === 0) return map;

  const { data, error } = await client.from('carreras').select('id, escudo_url').in('id', ids);
  if (error) throw error;
  for (const row of data || []) {
    const id = row?.id as number | undefined;
    const url = row?.escudo_url as string | null | undefined;
    if (id != null && url) map.set(id, url);
  }
  return map;
}

/** Fills `carrera_a` / `carrera_b` escudo_url when the FK join missed a logo stored on another carrera id (fusion / array sync). */
export async function enrichPartidosCarreraShieldsFromDb(
  client: SupabaseClient,
  rows: PartidoWithRelations[]
): Promise<PartidoWithRelations[]> {
  const ids = collectCarreraIdsForShieldEnrichment(rows);
  if (ids.length === 0) return rows;
  try {
    const map = await fetchCarreraEscudoMap(client, ids);
    return enrichPartidosWithCarreraEscudoMap(rows, map);
  } catch (e) {
    console.warn('[enrichPartidosCarreraShieldsFromDb] failed:', e);
    return rows;
  }
}

export function enrichPartidosWithCarreraEscudoMap(
  list: PartidoWithRelations[],
  escudoByCarreraId: ReadonlyMap<number, string | null | undefined>
): PartidoWithRelations[] {
  return list.map((p) => {
    const urlA = bestEscudoForSide(p, 'a', escudoByCarreraId);
    const urlB = bestEscudoForSide(p, 'b', escudoByCarreraId);
    let next: PartidoWithRelations = p;

    if (urlA) {
      next = {
        ...next,
        carrera_a: p.carrera_a
          ? { ...p.carrera_a, escudo_url: urlA }
          : { nombre: p.equipo_a, escudo_url: urlA },
      };
    }
    if (urlB) {
      next = {
        ...next,
        carrera_b: p.carrera_b
          ? { ...p.carrera_b, escudo_url: urlB }
          : { nombre: p.equipo_b, escudo_url: urlB },
      };
    }
    return next;
  });
}
