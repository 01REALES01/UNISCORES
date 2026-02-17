/**
 * Sport Scoring Logic & Validation
 * Maneja las reglas específicas de cada deporte
 */

export type ScoreDetail = Record<string, any>;

export type ScoreResult = {
    scoreA: number;
    scoreB: number;
    /** Sub-score: puntos del set/cuarto/tiempo actual */
    subScoreA?: number;
    subScoreB?: number;
    /** Label del período actual (e.g. "1º Tiempo", "Cuarto 2", "Set 3") */
    extra?: string;
    /** Label corto del sub-score (e.g. "Pts", "Goles") */
    subLabel?: string;
};

/**
 * Añade puntos al marcador según el deporte
 */
export function addPoints(
    deporte: string,
    detalle: ScoreDetail,
    equipo: 'equipo_a' | 'equipo_b',
    puntos: number = 1
): ScoreDetail {
    const nuevo = JSON.parse(JSON.stringify(detalle)); // Deep copy to avoid mutations

    // Aplicar cambio específico del deporte
    let resultado = nuevo;
    if (deporte === 'Fútbol') {
        resultado = addGoalFutbol(nuevo, equipo);
    } else if (deporte === 'Baloncesto') {
        resultado = addPointsBasket(nuevo, equipo, puntos);
    } else if (deporte === 'Voleibol') {
        resultado = addPointVolley(nuevo, equipo);
    } else if (deporte === 'Tenis de Mesa') {
        resultado = addPointTableTennis(nuevo, equipo);
    } else if (deporte === 'Tenis') {
        resultado = addGameTennis(nuevo, equipo);
    } else {
        // Genérico (Natación, etc.)
        if (deporte !== 'Natación') {
            const field = equipo === 'equipo_a' ? 'total_a' : 'total_b';
            nuevo[field] = (nuevo[field] || 0) + puntos;
        }
        resultado = nuevo;
    }

    // SIEMPRE Recalcular Totales para asegurar consistencia
    return recalculateTotals(deporte, resultado);
}

/**
 * Recalcular totales basados en los detalles (Sets, Tiempos, Cuartos)
 * Esto corrige inconsistencias si se editaron los parciales manualmente
 */
function recalculateTotals(deporte: string, detalle: ScoreDetail): ScoreDetail {
    const d = JSON.parse(JSON.stringify(detalle));

    if (deporte === 'Fútbol') {
        let totalA = 0;
        let totalB = 0;
        if (d.tiempos) {
            Object.values(d.tiempos).forEach((t: any) => {
                totalA += (t.goles_a || 0);
                totalB += (t.goles_b || 0);
            });
        }
        // Si hay tiempos, sobreescribir totales
        if (d.tiempos && Object.keys(d.tiempos).length > 0) {
            d.goles_a = totalA;
            d.goles_b = totalB;
        }
    }
    else if (deporte === 'Baloncesto') {
        let totalA = 0;
        let totalB = 0;
        if (d.cuartos) {
            Object.values(d.cuartos).forEach((c: any) => {
                totalA += (c.puntos_a || 0);
                totalB += (c.puntos_b || 0);
            });
        }
        if (d.cuartos && Object.keys(d.cuartos).length > 0) {
            d.total_a = totalA;
            d.total_b = totalB;
        }
    }
    else if (deporte === 'Voleibol' || deporte === 'Tenis de Mesa') {
        let setsA = 0;
        let setsB = 0;

        if (d.sets) {
            Object.entries(d.sets).forEach(([key, set]: [string, any]) => {
                const setNum = parseInt(key);
                const pA = set.puntos_a || 0;
                const pB = set.puntos_b || 0;

                // Lógica de Ganador de Set
                let minPts = 25;
                if (deporte === 'Voleibol' && setNum === 5) minPts = 15;
                if (deporte === 'Tenis de Mesa') minPts = 11;

                if (pA >= minPts && (pA - pB) >= 2) setsA++;
                else if (pB >= minPts && (pB - pA) >= 2) setsB++;
            });
        }

        d.sets_a = setsA;
        d.sets_b = setsB;
    }
    else if (deporte === 'Tenis') {
        let setsA = 0;
        let setsB = 0;
        if (d.sets) {
            Object.values(d.sets).forEach((set: any) => {
                const jA = set.juegos_a || 0;
                const jB = set.juegos_b || 0;

                // Lógica simplificada Tenis (6-x, 7-5, 7-6)
                if ((jA === 6 && jB <= 4) || (jA === 7 && jB <= 5)) setsA++;
                else if ((jB === 6 && jA <= 4) || (jB === 7 && jA <= 5)) setsB++;
            });
        }
        d.sets_a = setsA;
        d.sets_b = setsB;
    }

    return d;
}

/**
 * Fútbol: Añadir gol al tiempo actual
 */
function addGoalFutbol(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const tiempo = detalle.tiempo_actual || 1;
    const field = equipo === 'equipo_a' ? 'goles_a' : 'goles_b';

    // Incrementar goles totales
    detalle[field] = (detalle[field] || 0) + 1;

    // Incrementar goles del tiempo actual
    if (!detalle.tiempos) detalle.tiempos = {};
    if (!detalle.tiempos[tiempo]) detalle.tiempos[tiempo] = { goles_a: 0, goles_b: 0 };
    detalle.tiempos[tiempo][field] = (detalle.tiempos[tiempo][field] || 0) + 1;

    return detalle;
}

/**
 * Fútbol: Cambiar de tiempo
 */
export function cambiarTiempoFutbol(detalle: ScoreDetail): ScoreDetail {
    const nuevo = JSON.parse(JSON.stringify(detalle));
    const tiempoActual = nuevo.tiempo_actual || 1;

    if (tiempoActual === 1) {
        nuevo.tiempo_actual = 2;
        nuevo.minuto_actual = 0;
    }

    return nuevo;
}

/**
 * Baloncesto: Añadir puntos al cuarto actual
 */
function addPointsBasket(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const cuarto = detalle.cuarto_actual || 1;
    const fieldTotal = equipo === 'equipo_a' ? 'total_a' : 'total_b';
    const fieldCuarto = equipo === 'equipo_a' ? 'puntos_a' : 'puntos_b';

    // Incrementar total
    detalle[fieldTotal] = (detalle[fieldTotal] || 0) + puntos;

    // Incrementar puntos del cuarto actual
    if (!detalle.cuartos) detalle.cuartos = {};
    if (!detalle.cuartos[cuarto]) detalle.cuartos[cuarto] = { puntos_a: 0, puntos_b: 0 };
    detalle.cuartos[cuarto][fieldCuarto] = (detalle.cuartos[cuarto][fieldCuarto] || 0) + puntos;

    return detalle;
}

/**
 * Baloncesto: Cambiar de cuarto
 */
export function cambiarCuartoBasket(detalle: ScoreDetail): ScoreDetail {
    const nuevo = JSON.parse(JSON.stringify(detalle));
    const cuartoActual = nuevo.cuarto_actual || 1;

    if (cuartoActual < 4) {
        nuevo.cuarto_actual = cuartoActual + 1;
    }

    return nuevo;
}

/**
 * Voleibol: Añadir punto al set actual
 * Valida victoria de set (25 pts con 2 de diferencia, o 15 en el 5to set)
 */
function addPointVolley(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const setActual = detalle.set_actual || 1;
    const field = equipo === 'equipo_a' ? 'puntos_a' : 'puntos_b';

    // Incrementar puntos del set actual
    if (!detalle.sets) detalle.sets = {};
    if (!detalle.sets[setActual]) detalle.sets[setActual] = { puntos_a: 0, puntos_b: 0 };
    detalle.sets[setActual][field] = (detalle.sets[setActual][field] || 0) + 1;

    // Verificar si ganó el set
    const puntosA = detalle.sets[setActual].puntos_a;
    const puntosB = detalle.sets[setActual].puntos_b;
    const puntosMinimos = setActual === 5 ? 15 : 25;

    if (puntosA >= puntosMinimos && puntosA - puntosB >= 2) {
        detalle.sets_a = (detalle.sets_a || 0) + 1;
        if (setActual < 5) detalle.set_actual = setActual + 1;
    } else if (puntosB >= puntosMinimos && puntosB - puntosA >= 2) {
        detalle.sets_b = (detalle.sets_b || 0) + 1;
        if (setActual < 5) detalle.set_actual = setActual + 1;
    }

    return detalle;
}
function addPointTableTennis(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const setActual = detalle.set_actual || 1;
    const field = equipo === 'equipo_a' ? 'puntos_a' : 'puntos_b';

    if (!detalle.sets) detalle.sets = {};
    if (!detalle.sets[setActual]) detalle.sets[setActual] = { puntos_a: 0, puntos_b: 0 };

    // Sumar punto
    detalle.sets[setActual][field] = (detalle.sets[setActual][field] || 0) + 1;

    // Verificar si ganó el set (11 pts con diff >= 2)
    const ptsA = detalle.sets[setActual].puntos_a;
    const ptsB = detalle.sets[setActual].puntos_b;

    if (ptsA >= 11 && ptsA - ptsB >= 2) {
        detalle.sets_a = (detalle.sets_a || 0) + 1;
        // Avanzar set (usualmente juegan a mejor de 5 o 7, aka ganar 3 o 4)
        if ((detalle.sets_a || 0) < 3 && (detalle.sets_b || 0) < 3) detalle.set_actual = setActual + 1;
    } else if (ptsB >= 11 && ptsB - ptsA >= 2) {
        detalle.sets_b = (detalle.sets_b || 0) + 1;
        if ((detalle.sets_a || 0) < 3 && (detalle.sets_b || 0) < 3) detalle.set_actual = setActual + 1;
    }

    return detalle;
}

/**
 * Tenis de Campo: Sumar Juegos (Games)
 */
function addGameTennis(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const setActual = detalle.set_actual || 1;
    const field = equipo === 'equipo_a' ? 'juegos_a' : 'juegos_b';

    if (!detalle.sets) detalle.sets = {};
    if (!detalle.sets[setActual]) detalle.sets[setActual] = { juegos_a: 0, juegos_b: 0 };

    // Sumar JUEGO (GAME)
    detalle.sets[setActual][field] = (detalle.sets[setActual][field] || 0) + 1;

    // Verificar si ganó el set (6 juegos diff 2, o 7 juegos si tiebreak)
    const juegosA = detalle.sets[setActual].juegos_a;
    const juegosB = detalle.sets[setActual].juegos_b;

    // Lógica Set: 6-0, 6-1, 6-2, 6-3, 6-4, 7-5, 7-6
    let setGanado = false;
    let ganador = '';

    if (juegosA === 6 && juegosB <= 4) { setGanado = true; ganador = 'a'; }
    else if (juegosA === 7 && juegosB === 5) { setGanado = true; ganador = 'a'; }
    else if (juegosA === 7 && juegosB === 6) { setGanado = true; ganador = 'a'; } // Tiebreak ganado

    else if (juegosB === 6 && juegosA <= 4) { setGanado = true; ganador = 'b'; }
    else if (juegosB === 7 && juegosA === 5) { setGanado = true; ganador = 'b'; }
    else if (juegosB === 7 && juegosA === 6) { setGanado = true; ganador = 'b'; }

    if (setGanado) {
        if (ganador === 'a') detalle.sets_a = (detalle.sets_a || 0) + 1;
        else detalle.sets_b = (detalle.sets_b || 0) + 1;

        // Avanzar set (Mejor de 3 -> gana el que llega a 2)
        if ((detalle.sets_a || 0) < 2 && (detalle.sets_b || 0) < 2) detalle.set_actual = setActual + 1;
    }

    return detalle;
}

/**
 * Obtener marcador actual para mostrar
 */
export function getCurrentScore(deporte: string, detalle: ScoreDetail): ScoreResult {
    if (deporte === 'Fútbol') {
        const tiempo = detalle.tiempo_actual || 1;
        return {
            scoreA: detalle.goles_a || 0,
            scoreB: detalle.goles_b || 0,
            subScoreA: detalle.tiempos?.[tiempo]?.goles_a || 0,
            subScoreB: detalle.tiempos?.[tiempo]?.goles_b || 0,
            extra: `${tiempo}º Tiempo`,
            subLabel: `Goles ${tiempo}ºT`
        };
    } else if (deporte === 'Baloncesto') {
        const cuarto = detalle.cuarto_actual || 1;
        let label = `${cuarto}º Cuarto`;
        let subLabel = `Pts Q${cuarto}`;

        if (cuarto > 4) {
            label = `Prórroga ${cuarto - 4}`;
            subLabel = `Pts OT${cuarto - 4}`;
        }

        return {
            scoreA: detalle.total_a || 0,
            scoreB: detalle.total_b || 0,
            subScoreA: detalle.cuartos?.[cuarto]?.puntos_a || 0,
            subScoreB: detalle.cuartos?.[cuarto]?.puntos_b || 0,
            extra: label,
            subLabel: subLabel
        };
    } else if (deporte === 'Voleibol' || deporte === 'Tenis de Mesa') {
        const set = detalle.set_actual || 1;
        // En deportes de set, mostramos los PUNTOS en grande y los SETS en pequeño
        return {
            scoreA: detalle.sets?.[set]?.puntos_a || 0,
            scoreB: detalle.sets?.[set]?.puntos_b || 0,
            subScoreA: detalle.sets_a || 0,
            subScoreB: detalle.sets_b || 0,
            extra: `Set ${set}`,
            subLabel: 'Sets'
        };
    } else if (deporte === 'Tenis') {
        const set = detalle.set_actual || 1;
        // Tenis: Juegos en grande, Sets en pequeño
        return {
            scoreA: detalle.sets?.[set]?.juegos_a || 0,
            scoreB: detalle.sets?.[set]?.juegos_b || 0,
            subScoreA: detalle.sets_a || 0,
            subScoreB: detalle.sets_b || 0,
            extra: `Set ${set}`,
            subLabel: 'Sets'
        };
    } else {
        return {
            scoreA: detalle.total_a || 0,
            scoreB: detalle.total_b || 0
        };
    }
}

/**
 * Verificar si el partido ha terminado
 */
export function isMatchFinished(deporte: string, detalle: ScoreDetail): boolean {
    if (deporte === 'Fútbol') {
        return detalle.tiempo_actual === 2 && (detalle.minuto_actual || 0) >= 90;
    } else if (deporte === 'Baloncesto') {
        return detalle.cuarto_actual >= 4;
    } else if (deporte === 'Voleibol') {
        return (detalle.sets_a || 0) >= 3 || (detalle.sets_b || 0) >= 3;
    } else if (deporte === 'Tenis' || deporte === 'Tenis de Mesa') {
        return (detalle.sets_a || 0) >= 2 || (detalle.sets_b || 0) >= 2;
    }
    return false;
}

/**
 * Revertir puntos (Undo)
 * Usado cuando se elimina un evento de gol/punto
 */
export function removePoints(
    deporte: string,
    detalle: ScoreDetail,
    equipo: 'equipo_a' | 'equipo_b',
    puntos: number = 1
): ScoreDetail {
    const nuevo = JSON.parse(JSON.stringify(detalle)); // Deep copy

    if (deporte === 'Fútbol') {
        removeGoalFutbol(nuevo, equipo);
    } else if (deporte === 'Baloncesto') {
        removePointsBasket(nuevo, equipo, puntos);
    } else if (deporte === 'Voleibol') {
        removePointVolley(nuevo, equipo);
    } else if (deporte === 'Tenis' || deporte === 'Tenis de Mesa') {
        removePointTenis(nuevo, equipo);
    } else {
        const field = equipo === 'equipo_a' ? 'total_a' : 'total_b';
        nuevo[field] = Math.max(0, (nuevo[field] || 0) - puntos);
    }

    // SIEMPRE Recalcular Totales
    return recalculateTotals(deporte, nuevo);
}

function removeGoalFutbol(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b') {
    const tiempo = detalle.tiempo_actual || 1;
    const field = equipo === 'equipo_a' ? 'goles_a' : 'goles_b';
    const totalField = field;

    // Solo modificamos parciales, total se recalcula luego
    if (detalle.tiempos && detalle.tiempos[tiempo]) {
        detalle.tiempos[tiempo][field] = Math.max(0, (detalle.tiempos[tiempo][field] || 0) - 1);
    }
}

function removePointsBasket(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number) {
    const cuarto = detalle.cuarto_actual || 1;
    const fieldCuarto = equipo === 'equipo_a' ? 'puntos_a' : 'puntos_b';

    if (detalle.cuartos && detalle.cuartos[cuarto]) {
        detalle.cuartos[cuarto][fieldCuarto] = Math.max(0, (detalle.cuartos[cuarto][fieldCuarto] || 0) - puntos);
    }
}

function removePointVolley(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b') {
    const setActual = detalle.set_actual || 1;
    const field = equipo === 'equipo_a' ? 'puntos_a' : 'puntos_b';

    if (detalle.sets && detalle.sets[setActual]) {
        detalle.sets[setActual][field] = Math.max(0, (detalle.sets[setActual][field] || 0) - 1);
    }
}

function removePointTenis(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b') {
    const setActual = detalle.set_actual || 1;
    const field = equipo === 'equipo_a' ? 'juegos_a' : 'juegos_b';

    if (detalle.sets && detalle.sets[setActual]) {
        detalle.sets[setActual][field] = Math.max(0, (detalle.sets[setActual][field] || 0) - 1);
    }
}
