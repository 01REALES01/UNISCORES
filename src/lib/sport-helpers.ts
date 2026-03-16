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
    carrera_a?: { nombre: string } | null;
    carrera_b?: { nombre: string } | null;
    disciplinas?: { name: string } | null;
};

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

    // En individuales, la carrera viene de carrera_a?.nombre o delegacion_a
    if (side === 'a') {
        return partido.carrera_a?.nombre || partido.delegacion_a || null;
    }
    return partido.carrera_b?.nombre || partido.delegacion_b || null;
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
 * Logic extracted from medalleria-board.tsx for reuse in career profile pages.
 * 
 * @param matches - Array of finished matches with disciplinas, carrera_a/b joins and marcador_detalle
 * @param carreraName - The career name to compute stats for
 */
export function computeCareerStats(matches: any[], carreraName: string): CareerStats {
    const normalize = (str: string) =>
        str.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const normTarget = normalize(carreraName);

    const isTargetCarrera = (name: string): boolean => {
        const n = normalize(name);
        return n === normTarget || n.includes(normTarget) || normTarget.includes(n);
    };

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

    // Only process finished matches
    const finished = matches.filter(m =>
        (m.estado || '').toLowerCase().trim() === 'finalizado'
    );

    finished.forEach(m => {
        const disc = (Array.isArray(m.disciplinas) ? m.disciplinas[0] : m.disciplinas)?.name || 'Otro';
        const det = m.marcador_detalle || {};
        const fase = (m.fase || '').toLowerCase().trim();
        const isFinal = fase.includes('final');
        const isTercero = fase.includes('tercer') || fase.includes('3er') || fase.includes('3º');

        const rawA = getCarreraName(m, 'a');
        const rawB = getCarreraName(m, 'b');

        const isA = isTargetCarrera(rawA);
        const isB = isTargetCarrera(rawB);

        if (!isA && !isB) {
            // Check race results for this career
            if (det.tipo === 'carrera' && det.resultados) {
                (det.resultados as any[]).forEach(res => {
                    const possibleName = res.equipo_nombre || res.equipo || res.delegacion;
                    if (!possibleName || !isTargetCarrera(possibleName)) return;

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

        if (scoreA > scoreB) {
            if (isA) {
                stats.won++; stats.puntos += 3;
                stats.byDiscipline[disc].won++; stats.byDiscipline[disc].puntos += 3;
            } else {
                stats.lost++;
                stats.byDiscipline[disc].lost++;
            }
            // Medals (non-race)
            if (det.tipo !== 'carrera') {
                if (isFinal) {
                    if (isA) { stats.oro++; stats.byDiscipline[disc].oro++; }
                    else { stats.plata++; stats.byDiscipline[disc].plata++; }
                } else if (isTercero && isA) {
                    stats.bronce++; stats.byDiscipline[disc].bronce++;
                }
            }
        } else if (scoreB > scoreA) {
            if (isB) {
                stats.won++; stats.puntos += 3;
                stats.byDiscipline[disc].won++; stats.byDiscipline[disc].puntos += 3;
            } else {
                stats.lost++;
                stats.byDiscipline[disc].lost++;
            }
            if (det.tipo !== 'carrera') {
                if (isFinal) {
                    if (isB) { stats.oro++; stats.byDiscipline[disc].oro++; }
                    else { stats.plata++; stats.byDiscipline[disc].plata++; }
                } else if (isTercero && isB) {
                    stats.bronce++; stats.byDiscipline[disc].bronce++;
                }
            }
        } else {
            stats.draw++; stats.puntos += 1;
            stats.byDiscipline[disc].draw++; stats.byDiscipline[disc].puntos += 1;
        }

        // Race results within this match
        if (det.tipo === 'carrera' && det.resultados) {
            (det.resultados as any[]).forEach(res => {
                const possibleName = res.equipo_nombre || res.equipo || res.delegacion;
                if (!possibleName || !isTargetCarrera(possibleName)) return;

                if (res.puesto === 1) { stats.oro++; stats.byDiscipline[disc].oro++; }
                else if (res.puesto === 2) { stats.plata++; stats.byDiscipline[disc].plata++; }
                else if (res.puesto === 3) { stats.bronce++; stats.byDiscipline[disc].bronce++; }
            });
        }
    });

    return stats;
}

