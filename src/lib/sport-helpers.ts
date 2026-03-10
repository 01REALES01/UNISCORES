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
