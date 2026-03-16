// ─────────────────────────────────────────────────────────────────────────────
// BaseSportService — clase base con utilidades compartidas
// ─────────────────────────────────────────────────────────────────────────────

import type { ISportService, ScoreDetail, ScoreResult } from '@/modules/sports/types';

export abstract class BaseSportService implements ISportService {
  abstract getPeriodDuration(): number;
  abstract isCountdown(): boolean;
  abstract getCurrentPeriodNumber(detalle: ScoreDetail): number;
  abstract getCurrentScore(detalle: ScoreDetail): ScoreResult;
  abstract isFinished(detalle: ScoreDetail): boolean;
  abstract addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos?: number): ScoreDetail;
  abstract removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos?: number): ScoreDetail;
  abstract setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail;
  abstract recalculateTotals(detalle: ScoreDetail): ScoreDetail;

  /** Deep clone sin dependencias externas */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  protected clone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /** Devuelve el campo correcto según el equipo */
  protected fieldFor(equipo: 'equipo_a' | 'equipo_b', fieldA: string, fieldB: string): string {
    return equipo === 'equipo_a' ? fieldA : fieldB;
  }

  /** Siguiente período genérico — cada servicio puede sobreescribir */
  nextPeriod(detalle: ScoreDetail): ScoreDetail {
    return this.clone(detalle);
  }
}
