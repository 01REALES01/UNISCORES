import type { SupabaseClient } from '@supabase/supabase-js';
import type { PartidoWithRelations } from '@/modules/matches/types';
import { applyCarreraDelegacionEscudoAliases, normalizeNombreLoose } from '@/lib/carrera-delegacion-escudo-alias';
import { EQUIPO_NOMBRE_TO_CARRERAS } from '@/lib/constants';

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

/** Combined teams: use the canonical carrera shield (constants) even when FK / join is another member (e.g. Escuela de Negocios). */
function preferredShieldCarreraNombreForSide(partido: PartidoWithRelations, side: 'a' | 'b'): string | null {
  const equipo = side === 'a' ? partido.equipo_a : partido.equipo_b;
  const fromEquipo = preferredShieldCarreraNombreFromLabel(equipo);
  if (fromEquipo) return fromEquipo;
  const del = side === 'a' ? partido.delegacion_a : partido.delegacion_b;
  return preferredShieldCarreraNombreFromLabel(del);
}

function preferredShieldCarreraNombreFromLabel(label: string | null | undefined): string | null {
  if (!label?.trim()) return null;
  const list = EQUIPO_NOMBRE_TO_CARRERAS[label.trim().toUpperCase()];
  return list?.[0] ?? null;
}

function bestEscudoForSide(
  partido: PartidoWithRelations,
  side: 'a' | 'b',
  escudoByCarreraId: ReadonlyMap<number, string | null | undefined>,
  nombreByCarreraId: ReadonlyMap<number, string | null | undefined>
): string | undefined {
  const preferredNombre = preferredShieldCarreraNombreForSide(partido, side);
  if (preferredNombre) {
    const target = normalizeNombreLoose(preferredNombre);
    for (const id of orderedCarreraIdsForSide(partido, side)) {
      const nom = nombreByCarreraId.get(id);
      if (nom && normalizeNombreLoose(nom) === target) {
        const u = escudoByCarreraId.get(id);
        if (u) return u;
      }
    }
  }

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

export type CarreraEscudoFetch = {
  escudoByCarreraId: Map<number, string>;
  nombreByCarreraId: Map<number, string>;
};

export async function fetchCarreraEscudoMap(
  client: SupabaseClient,
  ids: number[]
): Promise<CarreraEscudoFetch> {
  const escudoByCarreraId = new Map<number, string>();
  const nombreByCarreraId = new Map<number, string>();
  if (ids.length === 0) return { escudoByCarreraId, nombreByCarreraId };

  const { data, error } = await client.from('carreras').select('id, nombre, escudo_url').in('id', ids);
  if (error) throw error;
  const rows = (data || []) as { id: number; nombre: string; escudo_url: string | null }[];
  for (const row of rows) {
    const id = row.id;
    if (id != null && row.nombre) nombreByCarreraId.set(id, row.nombre);
    const url = row.escudo_url?.trim();
    if (id != null && url) escudoByCarreraId.set(id, url);
  }
  await applyCarreraDelegacionEscudoAliases(client, rows, escudoByCarreraId);
  return { escudoByCarreraId, nombreByCarreraId };
}

/** Fills `carrera_a` / `carrera_b` escudo_url when the FK join missed a logo stored on another carrera id (fusion / array sync). */
export async function enrichPartidosCarreraShieldsFromDb(
  client: SupabaseClient,
  rows: PartidoWithRelations[]
): Promise<PartidoWithRelations[]> {
  const ids = collectCarreraIdsForShieldEnrichment(rows);
  if (ids.length === 0) return rows;
  try {
    const { escudoByCarreraId, nombreByCarreraId } = await fetchCarreraEscudoMap(client, ids);
    return enrichPartidosWithCarreraEscudoMap(rows, escudoByCarreraId, nombreByCarreraId);
  } catch (e) {
    console.warn('[enrichPartidosCarreraShieldsFromDb] failed:', e);
    return rows;
  }
}

export function enrichPartidosWithCarreraEscudoMap(
  list: PartidoWithRelations[],
  escudoByCarreraId: ReadonlyMap<number, string | null | undefined>,
  nombreByCarreraId: ReadonlyMap<number, string | null | undefined>
): PartidoWithRelations[] {
  return list.map((p) => {
    const urlA = bestEscudoForSide(p, 'a', escudoByCarreraId, nombreByCarreraId);
    const urlB = bestEscudoForSide(p, 'b', escudoByCarreraId, nombreByCarreraId);
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
