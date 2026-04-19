/**
 * Filtrado de partidos en historial / próximos del perfil:
 * un deportista solo debe ver encuentros de su género (o mixtos), salvo cuando
 * está vinculado explícitamente al partido (athlete_a/b o eventos de su jugador).
 */

export type NormalizedGender = 'masculino' | 'femenino' | 'mixto';

/** Normaliza texto de género (perfil, jugadores, partidos). */
export function normalizeGenderLoose(
  g: string | null | undefined
): NormalizedGender | null {
  if (!g || typeof g !== 'string') return null;
  const x = g
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
  if (x === 'm' || x.startsWith('masc')) return 'masculino';
  if (x === 'f' || x.startsWith('fem')) return 'femenino';
  if (x.startsWith('mix')) return 'mixto';
  return null;
}

/**
 * ¿El partido es compatible con el género del deportista?
 * - Mixto o sin género en partido: visible para todos.
 * - Si no conocemos género del atleta: no excluimos por género (evita vaciar perfiles legacy).
 */
export function matchGenderCompatibleWithAthlete(
  matchGenero: string | null | undefined,
  athleteGenero: string | null | undefined
): boolean {
  const mg = normalizeGenderLoose(matchGenero);
  const ag = normalizeGenderLoose(athleteGenero);
  if (!mg || mg === 'mixto') return true;
  if (!ag) return true;
  return mg === ag;
}

/** Prioridad: jugadores (misma persona puede tener varias filas; usamos la primera con género). */
export function resolveAthleteGenderFromContext(
  jugRows: ReadonlyArray<{ genero?: string | null }>,
  profile: { genero?: string | null; sexo?: string | null } | null | undefined
): string | null {
  for (const j of jugRows) {
    const g = normalizeGenderLoose(j.genero ?? undefined);
    if (g) return j.genero ?? null;
  }
  const fromProfile =
    normalizeGenderLoose(profile?.genero ?? undefined) ||
    normalizeGenderLoose(profile?.sexo ?? undefined);
  if (fromProfile) return profile?.genero || profile?.sexo || null;
  return null;
}

function setHasId(set: ReadonlySet<number | string>, id: number | string): boolean {
  return set.has(id) || set.has(String(id));
}

export function shouldIncludePartidoInProfileHistory(opts: {
  partido: {
    id: number | string;
    genero?: string | null;
    athlete_a_id?: string | null;
    athlete_b_id?: string | null;
  };
  profileId: string;
  athleteGenderResolved: string | null;
  /** Partidos con eventos olímpicos del jugador (siempre incluir). */
  matchIdsFromAthleteEvents: ReadonlySet<number | string>;
  /** Partidos con roster / participación explícita (p. ej. perfil propio). Opcional. */
  matchIdsTrustedParticipation?: ReadonlySet<number | string>;
}): boolean {
  const { partido: p, profileId, athleteGenderResolved, matchIdsFromAthleteEvents, matchIdsTrustedParticipation } =
    opts;

  if (p.athlete_a_id === profileId || p.athlete_b_id === profileId) return true;

  const id = p.id;
  if (setHasId(matchIdsFromAthleteEvents, id)) return true;
  if (matchIdsTrustedParticipation && setHasId(matchIdsTrustedParticipation, id)) return true;

  return matchGenderCompatibleWithAthlete(p.genero, athleteGenderResolved);
}

/** Normaliza `estado` del partido para comparar (programado, finalizado, en_curso, etc.). */
export function normalizePartidoEstado(estado: string | null | undefined): string {
  return (estado ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}
