/**
 * sport-helpers.ts
 * Helpers centralizados para distinguir deportes individuales vs colectivos.
 * 
 * - Deportes colectivos: Fútbol, Voleibol, Baloncesto
 *   → equipo_a/b = carrera, carrera_a/b = carrera
 * 
 * - Deportes individuales: Tenis, Tenis de Mesa, Ajedrez, Natación
 *   → equipo_a/b = nombre del deportista
 *   → delegacion_a/b = carrera que representa
 *   → carrera_a/b = carrera (vinculada a delegación)
 */

import { DEPORTES_INDIVIDUALES } from './constants';

/**
 * Determina si un deporte es individual.
 */
export function isIndividualSport(sportName?: string): boolean {
    if (!sportName) return false;
    return DEPORTES_INDIVIDUALES.includes(sportName);
}

type PartidoLike = {
    equipo_a: string;
    equipo_b: string;
    delegacion_a?: string;
    delegacion_b?: string;
    carrera_a?: { nombre: string; escudo_url?: string | null } | null;
    carrera_b?: { nombre: string; escudo_url?: string | null } | null;
    delegacion_a_info?: { escudo_url?: string } | null;
    delegacion_b_info?: { escudo_url?: string } | null;
    atleta_a?: { avatar_url?: string } | null;
    atleta_b?: { avatar_url?: string } | null;
    disciplinas?: { name: string } | null;
};

/**
 * URL de imagen para un lado del partido (avatar en individuales, escudo de carrera o delegación).
 * Coherente con calendario y listados de partidos. El nombre de disciplina queda por si hace falta ramificar.
 */
export function getMatchSideImageUrl(
    _sport: string,
    side: 'a' | 'b',
    partido: PartidoLike
): string | undefined {
    if (side === 'a') {
        return (
            partido.atleta_a?.avatar_url ||
            partido.carrera_a?.escudo_url ||
            partido.delegacion_a_info?.escudo_url ||
            undefined
        );
    }
    return (
        partido.atleta_b?.avatar_url ||
        partido.carrera_b?.escudo_url ||
        partido.delegacion_b_info?.escudo_url ||
        undefined
    );
}

/**
 * Retorna el nombre para MOSTRAR en la UI (lo que el usuario ve como "participante").
 * - Colectivos: carrera_a?.nombre || equipo_a (ej: "Derecho")
 * - Individuales: equipo_a (ej: "Fernando Barrios")
 */
export function getDisplayName(partido: PartidoLike, side: 'a' | 'b'): string {
    const sportName = partido.disciplinas?.name;
    if (isIndividualSport(sportName)) {
        // En individuales, equipo_a/b tiene el nombre del deportista
        return side === 'a' ? partido.equipo_a : partido.equipo_b;
    }
    // En colectivos, preferimos carrera_a?.nombre, fallback a equipo_a
    if (side === 'a') return partido.carrera_a?.nombre || partido.equipo_a;
    return partido.carrera_b?.nombre || partido.equipo_b;
}

/**
 * Retorna el nombre de la CARRERA que el participante representa.
 * Esto siempre retorna una carrera, tanto en individuales como en colectivos.
 * Útil para filtrado por favoritos y para asignar puntos al medallero.
 * 
 * - Colectivos: carrera_a?.nombre || equipo_a
 * - Individuales: carrera_a?.nombre || delegacion_a || equipo_a (fallback)
 */
export function getCarreraName(partido: PartidoLike, side: 'a' | 'b'): string {
    if (side === 'a') {
        return partido.carrera_a?.nombre || partido.delegacion_a || partido.equipo_a;
    }
    return partido.carrera_b?.nombre || partido.delegacion_b || partido.equipo_b;
}

/**
 * Retorna el subtítulo (carrera) para deportes individuales.
 * Retorna null para deportes colectivos (no necesitan subtítulo).
 */
export function getCarreraSubtitle(partido: PartidoLike, side: 'a' | 'b'): string | null {
    const sportName = partido.disciplinas?.name;
    if (!isIndividualSport(sportName)) return null;

    const mainName = getDisplayName(partido, side);
    const subtitle = side === 'a' 
        ? (partido.carrera_a?.nombre || partido.delegacion_a || null)
        : (partido.carrera_b?.nombre || partido.delegacion_b || null);

    // Evitar redundancia si el subtítulo es igual al nombre (común en errores de data o carga manual)
    if (subtitle && mainName && subtitle.toLowerCase().trim() === mainName.toLowerCase().trim()) {
        return null;
    }

    return subtitle;
}

/**
 * Returns a 2-letter abbreviation for a participant name.
 * e.g. "Ingeniería de Sistemas" -> "IS" or "IN" (depending on words)
 */
export function getAbbr(name?: string): string {
    if (!name) return "??";
    // Clean and split by spaces/special chars
    const words = name.replace(/[^\w\s]/gi, '').split(/\s+/).filter(word => word.length > 2);
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
}

// ── Race / Swimming Helpers ──────────────────────────────────────────────────

import { isRaceSport as _isRaceSport } from './constants';
export { _isRaceSport as isRaceSportCheck };

/**
 * Check if a partido uses the multi-competitor race model
 */
export function isRaceMatch(partido: { marcador_detalle?: any }): boolean {
    return partido?.marcador_detalle?.tipo === 'carrera';
}

/**
 * Generate a human-readable title for a swimming/race event.
 * e.g. "50m Libre" or the event name stored in equipo_a.
 */
export function getSwimmingEventTitle(partido: PartidoLike & { marcador_detalle?: any }): string {
    const det = partido.marcador_detalle || {};
    if (det.distancia && det.estilo) {
        return `${det.distancia} ${det.estilo}`;
    }
    // Fallback to equipo_a which stores the event name
    return partido.equipo_a || 'Prueba de Natación';
}

/**
 * Parse a time string (mm:ss.xx or ss.xx) into milliseconds for accurate sorting.
 * Returns Infinity if unparseable (so invalid times sort to the bottom).
 */
export function parseTimeToMs(timeStr?: string): number {
    if (!timeStr || timeStr.trim() === '') return Infinity;
    const cleaned = timeStr.trim();

    // Format: mm:ss.xx
    const longMatch = cleaned.match(/^(\d{1,2}):(\d{1,2})\.(\d{1,3})$/);
    if (longMatch) {
        const mins = parseInt(longMatch[1]);
        const secs = parseInt(longMatch[2]);
        const ms = parseInt(longMatch[3].padEnd(3, '0'));
        return mins * 60000 + secs * 1000 + ms;
    }

    // Format: ss.xx
    const shortMatch = cleaned.match(/^(\d{1,3})\.(\d{1,3})$/);
    if (shortMatch) {
        const secs = parseInt(shortMatch[1]);
        const ms = parseInt(shortMatch[2].padEnd(3, '0'));
        return secs * 1000 + ms;
    }

    // Format: mm:ss (no ms)
    const noMsMatch = cleaned.match(/^(\d{1,2}):(\d{1,2})$/);
    if (noMsMatch) {
        const mins = parseInt(noMsMatch[1]);
        const secs = parseInt(noMsMatch[2]);
        return mins * 60000 + secs * 1000;
    }

    return Infinity;
}

/**
 * Validate time format: accepts mm:ss.xx, ss.xx, or mm:ss
 */
export function isValidTimeFormat(timeStr: string): boolean {
    if (!timeStr || timeStr.trim() === '') return true; // Empty is OK (pending)
    return parseTimeToMs(timeStr) !== Infinity;
}

// ── Career Stats Computation ─────────────────────────────────────────────────

export type DisciplineStats = {
    name: string;
    oro: number;
    plata: number;
    bronce: number;
    won: number;
    lost: number;
    draw: number;
    played: number;
    puntos: number;
};

export type CareerStats = {
    oro: number;
    plata: number;
    bronce: number;
    puntos: number;
    won: number;
    lost: number;
    draw: number;
    played: number;
    byDiscipline: Record<string, DisciplineStats>;
};

/**
 * Compute medal/wins/losses stats for a single career from a set of finished matches.
 * Uses carrera_a_ids / carrera_b_ids arrays so fusions are handled correctly:
 * a career that participates as part of a fusion still gets credited for every match.
 *
 * @param matches    - Array of finished matches with carrera_a_ids / carrera_b_ids fields
 * @param carreraId  - The numeric ID of the career to compute stats for
 */
export function computeCareerStats(matches: any[], carreraId: number): CareerStats {
    const stats: CareerStats = {
        oro: 0, plata: 0, bronce: 0, puntos: 0,
        won: 0, lost: 0, draw: 0, played: 0,
        byDiscipline: {},
    };

    const ensureDiscipline = (name: string) => {
        if (!stats.byDiscipline[name]) {
            stats.byDiscipline[name] = {
                name, oro: 0, plata: 0, bronce: 0,
                won: 0, lost: 0, draw: 0, played: 0, puntos: 0,
            };
        }
    };

    const finished = matches.filter(m =>
        (m.estado || '').toLowerCase().trim() === 'finalizado'
    );

    finished.forEach(m => {
        const disc = (Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas)?.name || 'Otro';
        const det = m.marcador_detalle || {};
        const fase = (m.fase || '').toLowerCase().trim();
        const isFinal = fase.includes('final');
        const isTercero = fase.includes('tercer') || fase.includes('3er') || fase.includes('3º');

        // Use ID arrays as source of truth (handles solo careers and fusions equally)
        const idsA: number[] = m.carrera_a_ids ?? [];
        const idsB: number[] = m.carrera_b_ids ?? [];
        const isA = idsA.includes(carreraId);
        const isB = idsB.includes(carreraId);

        if (!isA && !isB) {
            // Check race participantes for this career (Natación format)
            const participantes: any[] = det.participantes ?? det.resultados ?? [];
            if (det.tipo === 'carrera' && participantes.length > 0) {
                participantes.forEach((res: any) => {
                    const resIds: number[] = res.carrera_ids ?? (res.carrera_id ? [res.carrera_id] : []);
                    if (!resIds.includes(carreraId)) return;
                    ensureDiscipline(disc);
                    stats.played++;
                    stats.byDiscipline[disc].played++;
                    if (res.puesto === 1) { stats.oro++; stats.byDiscipline[disc].oro++; }
                    else if (res.puesto === 2) { stats.plata++; stats.byDiscipline[disc].plata++; }
                    else if (res.puesto === 3) { stats.bronce++; stats.byDiscipline[disc].bronce++; }
                });
            }
            return;
        }

        ensureDiscipline(disc);
        stats.played++;
        stats.byDiscipline[disc].played++;

        const scoreA = det.goles_a ?? det.sets_a ?? det.total_a ?? det.puntos_a ?? det.juegos_a ?? 0;
        const scoreB = det.goles_b ?? det.sets_b ?? det.total_b ?? det.puntos_b ?? det.juegos_b ?? 0;

        // Skip score-based logic for race-type matches (medals come from participantes)
        if (det.tipo === 'carrera') return;

        if (scoreA > scoreB) {
            if (isA) {
                stats.won++; stats.puntos += 3;
                stats.byDiscipline[disc].won++; stats.byDiscipline[disc].puntos += 3;
            } else {
                stats.lost++;
                stats.byDiscipline[disc].lost++;
            }
            if (isFinal) {
                if (isA) { stats.oro++; stats.byDiscipline[disc].oro++; }
                else     { stats.plata++; stats.byDiscipline[disc].plata++; }
            } else if (isTercero && isA) {
                stats.bronce++; stats.byDiscipline[disc].bronce++;
            }
        } else if (scoreB > scoreA) {
            if (isB) {
                stats.won++; stats.puntos += 3;
                stats.byDiscipline[disc].won++; stats.byDiscipline[disc].puntos += 3;
            } else {
                stats.lost++;
                stats.byDiscipline[disc].lost++;
            }
            if (isFinal) {
                if (isB) { stats.oro++; stats.byDiscipline[disc].oro++; }
                else     { stats.plata++; stats.byDiscipline[disc].plata++; }
            } else if (isTercero && isB) {
                stats.bronce++; stats.byDiscipline[disc].bronce++;
            }
        } else {
            stats.draw++; stats.puntos += 1;
            stats.byDiscipline[disc].draw++; stats.byDiscipline[disc].puntos += 1;
        }
    });

    return stats;
}

