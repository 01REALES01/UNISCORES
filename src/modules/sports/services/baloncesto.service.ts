// ─────────────────────────────────────────────────────────────────────────────
// BaloncestoService — Baloncesto
// 4 cuartos de 12 min, múltiples prórrogas, puntos 1/2/3
// Recálculo siempre desde sub-scores de cuartos para garantizar consistencia
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export class BaloncestoService extends BaseSportService {
  getPeriodDuration(): number { return 12; }
  isCountdown(): boolean { return true; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    const d = detalle as any;
    return d.cuarto_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const cuarto = d.cuarto_actual || 1;
    const isOT = cuarto > 4;
    const label = isOT ? `Prórroga ${cuarto - 4}` : `${cuarto}º Cuarto`;
    const subLabel = isOT ? `Pts OT${cuarto - 4}` : `Pts Q${cuarto}`;

    return {
      scoreA: d.total_a || 0,
      scoreB: d.total_b || 0,
      subScoreA: d.cuartos?.[cuarto]?.puntos_a || 0,
      subScoreB: d.cuartos?.[cuarto]?.puntos_b || 0,
      extra: label,
      subLabel,
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    return (d.cuarto_actual || 1) >= 4;
  }

  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number = 1): ScoreDetail {
    const d = this.clone(detalle) as any;
    const cuarto = d.cuarto_actual || 1;
    const fieldCuarto = this.fieldFor(equipo, 'puntos_a', 'puntos_b');

    if (!d.cuartos) d.cuartos = {};
    if (!d.cuartos[cuarto]) d.cuartos[cuarto] = { puntos_a: 0, puntos_b: 0 };
    d.cuartos[cuarto][fieldCuarto] = (d.cuartos[cuarto][fieldCuarto] || 0) + puntos;

    return this.recalculateTotals(d);
  }

  removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number = 1): ScoreDetail {
    const d = this.clone(detalle) as any;
    const cuarto = d.cuarto_actual || 1;
    const fieldCuarto = this.fieldFor(equipo, 'puntos_a', 'puntos_b');

    if (d.cuartos?.[cuarto]) {
      d.cuartos[cuarto][fieldCuarto] = Math.max(0, (d.cuartos[cuarto][fieldCuarto] || 0) - puntos);
    }

    return this.recalculateTotals(d);
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const cuarto = d.cuarto_actual || 1;
    const fieldTotal = this.fieldFor(equipo, 'total_a', 'total_b');
    const fieldCuarto = this.fieldFor(equipo, 'puntos_a', 'puntos_b');

    let puntosOtrosCuartos = 0;
    if (d.cuartos) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      Object.entries(d.cuartos).forEach(([key, q]: [string, any]) => {
        if (parseInt(key) !== cuarto) puntosOtrosCuartos += q[fieldCuarto] || 0;
      });
    }

    if (!d.cuartos) d.cuartos = {};
    if (!d.cuartos[cuarto]) d.cuartos[cuarto] = { puntos_a: 0, puntos_b: 0 };

    d.cuartos[cuarto][fieldCuarto] = Math.max(0, puntos - puntosOtrosCuartos);
    d[fieldTotal] = puntos;

    return this.recalculateTotals(d);
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    if (!d.cuartos || Object.keys(d.cuartos).length === 0) return d;

    let totalA = 0;
    let totalB = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(d.cuartos).forEach((c: any) => {
      totalA += c.puntos_a || 0;
      totalB += c.puntos_b || 0;
    });

    d.total_a = totalA;
    d.total_b = totalB;
    return d;
  }

  /** Avanza al siguiente cuarto; soporta prórrogas ilimitadas */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    d.cuarto_actual = (d.cuarto_actual || 1) + 1;
    return d;
  }
}
