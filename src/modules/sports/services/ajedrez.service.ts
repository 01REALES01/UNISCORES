// ─────────────────────────────────────────────────────────────────────────────
// AjedrezService — Ajedrez
// Modelo simple: total_a / total_b acumulan puntos (1 por victoria, 0.5 tablas)
// No hay sub-períodos ni sets; el árbitro controla el avance
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export class AjedrezService extends BaseSportService {
  getPeriodDuration(): number { return 0; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    return (detalle as any).ronda_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    return {
      scoreA: d.total_a || 0,
      scoreB: d.total_b || 0,
      extra: d.ronda_actual ? `Ronda ${d.ronda_actual}` : undefined,
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    const rondas = d.rondas || 0;
    const actual = d.ronda_actual || 1;
    return rondas > 0 && actual > rondas;
  }

  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number = 1): ScoreDetail {
    const d = this.clone(detalle) as any;
    const field = this.fieldFor(equipo, 'total_a', 'total_b');
    d[field] = (d[field] || 0) + puntos;
    return d;
  }

  removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number = 1): ScoreDetail {
    const d = this.clone(detalle) as any;
    const field = this.fieldFor(equipo, 'total_a', 'total_b');
    d[field] = Math.max(0, (d[field] || 0) - puntos);
    return d;
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const field = this.fieldFor(equipo, 'total_a', 'total_b');
    d[field] = Math.max(0, puntos);
    return d;
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    // Sin sub-períodos, los totales son la fuente de verdad
    return this.clone(detalle);
  }

  /** Avanza a la siguiente ronda */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    d.ronda_actual = (d.ronda_actual || 1) + 1;
    return d;
  }
}
