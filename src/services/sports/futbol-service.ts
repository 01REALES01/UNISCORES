import { ScoreDetail, ScoreResult } from "@/lib/sport-scoring";
import { ISportService } from "./types";

export class FutbolService implements ISportService {
    getPeriodDuration(): number {
        return 45; // 45 min por tiempo
    }

    isCountdown(): boolean {
        return false;
    }

    getCurrentPeriodNumber(detalle: ScoreDetail): number {
        return detalle.tiempo_actual || 1;
    }

    getCurrentScore(detalle: ScoreDetail): ScoreResult {
        const tiempo = detalle.tiempo_actual || 1;
        return {
            scoreA: detalle.goles_a || 0,
            scoreB: detalle.goles_b || 0,
            subScoreA: detalle.tiempos?.[tiempo]?.goles_a || 0,
            subScoreB: detalle.tiempos?.[tiempo]?.goles_b || 0,
            extra: `${tiempo}º Tiempo`,
            subLabel: `Goles ${tiempo}ºT`
        };
    }

    isFinished(detalle: ScoreDetail): boolean {
        return detalle.tiempo_actual === 2 && (detalle.minuto_actual || 0) >= 90;
    }

    addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
        const d = JSON.parse(JSON.stringify(detalle));
        const tiempo = d.tiempo_actual || 1;
        const field = equipo === 'equipo_a' ? 'goles_a' : 'goles_b';

        // Incrementar goles totales
        d[field] = (d[field] || 0) + 1;

        // Incrementar goles del tiempo actual
        if (!d.tiempos) d.tiempos = {};
        if (!d.tiempos[tiempo]) d.tiempos[tiempo] = { goles_a: 0, goles_b: 0 };
        d.tiempos[tiempo][field] = (d.tiempos[tiempo][field] || 0) + 1;

        return this.recalculateTotals(d);
    }

    removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
        const d = JSON.parse(JSON.stringify(detalle));
        const tiempo = d.tiempo_actual || 1;
        const field = equipo === 'equipo_a' ? 'goles_a' : 'goles_b';

        if (d.tiempos && d.tiempos[tiempo]) {
            d.tiempos[tiempo][field] = Math.max(0, (d.tiempos[tiempo][field] || 0) - 1);
        }

        return this.recalculateTotals(d);
    }

    setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
        const d = JSON.parse(JSON.stringify(detalle));
        const field = equipo === 'equipo_a' ? 'goles_a' : 'goles_b';
        const tiempo = d.tiempo_actual || 1;

        d[field] = puntos;

        if (!d.tiempos) d.tiempos = {};
        if (!d.tiempos[tiempo]) d.tiempos[tiempo] = { goles_a: 0, goles_b: 0 };

        // Forzamos el tiempo actual a cuadrar la caja.
        d.tiempos[tiempo][field] = puntos;

        return this.recalculateTotals(d);
    }

    recalculateTotals(detalle: ScoreDetail): ScoreDetail {
        const d = JSON.parse(JSON.stringify(detalle));
        let totalA = 0;
        let totalB = 0;
        
        if (d.tiempos) {
            Object.values(d.tiempos).forEach((t: any) => {
                totalA += (t.goles_a || 0);
                totalB += (t.goles_b || 0);
            });
        }

        if (d.tiempos && Object.keys(d.tiempos).length > 0) {
            d.goles_a = totalA;
            d.goles_b = totalB;
        }

        return d;
    }

    // Método extra específico de Fútbol
    cambiarTiempo(detalle: ScoreDetail): ScoreDetail {
        const d = JSON.parse(JSON.stringify(detalle));
        const tiempoActual = d.tiempo_actual || 1;

        if (tiempoActual === 1) {
            d.tiempo_actual = 2;
            d.minuto_actual = 0;
        }

        return d;
    }
}
