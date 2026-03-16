// ─────────────────────────────────────────────────────────────────────────────
// FutbolService — Fútbol y Futsal
// Lógica por tiempos (1º y 2º), con recálculo siempre desde parciales
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export class FutbolService extends BaseSportService {
  getPeriodDuration(): number { return 45; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    const d = detalle as any;
    return d.tiempo_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const tiempo = d.tiempo_actual || 1;
    return {
      scoreA: d.goles_a || 0,
      scoreB: d.goles_b || 0,
      subScoreA: d.tiempos?.[tiempo]?.goles_a || 0,
      subScoreB: d.tiempos?.[tiempo]?.goles_b || 0,
      extra: `${tiempo}º Tiempo`,
      subLabel: `Goles ${tiempo}ºT`,
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    return d.tiempo_actual === 2 && (d.minuto_actual || 0) >= 90;
  }

  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const tiempo = d.tiempo_actual || 1;
    const field = this.fieldFor(equipo, 'goles_a', 'goles_b');

    if (!d.tiempos) d.tiempos = {};
    if (!d.tiempos[tiempo]) d.tiempos[tiempo] = { goles_a: 0, goles_b: 0 };
    d.tiempos[tiempo][field] = (d.tiempos[tiempo][field] || 0) + 1;

    return this.recalculateTotals(d);
  }

  removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const tiempo = d.tiempo_actual || 1;
    const field = this.fieldFor(equipo, 'goles_a', 'goles_b');

    if (d.tiempos?.[tiempo]) {
      d.tiempos[tiempo][field] = Math.max(0, (d.tiempos[tiempo][field] || 0) - 1);
    }

    return this.recalculateTotals(d);
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const tiempo = d.tiempo_actual || 1;
    const field = this.fieldFor(equipo, 'goles_a', 'goles_b');

    if (!d.tiempos) d.tiempos = {};
    if (!d.tiempos[tiempo]) d.tiempos[tiempo] = { goles_a: 0, goles_b: 0 };

    // Distribuye la edición en el tiempo actual; recalculateTotals suma todos los tiempos
    d.tiempos[tiempo][field] = Math.max(0, puntos);

    return this.recalculateTotals(d);
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    if (!d.tiempos || Object.keys(d.tiempos).length === 0) return d;

    let totalA = 0;
    let totalB = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(d.tiempos).forEach((t: any) => {
      totalA += t.goles_a || 0;
      totalB += t.goles_b || 0;
    });

    d.goles_a = totalA;
    d.goles_b = totalB;
    return d;
  }

  /** Avanza al siguiente tiempo (1 → 2) */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    if ((d.tiempo_actual || 1) === 1) {
      d.tiempo_actual = 2;
      d.minuto_actual = 0;
    }
    return d;
  }
}
