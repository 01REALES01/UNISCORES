// ─────────────────────────────────────────────────────────────────────────────
// TenisMesaService — Tenis de Mesa (Ping-Pong)
// Sets a 11 pts (diff ≥ 2); best-of-5 (gana con 3 sets)
// Auto-avanza set_actual cuando alguien gana el set actual
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export class TenisMesaService extends BaseSportService {
  getPeriodDuration(): number { return 0; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    return (detalle as any).set_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const set = d.set_actual || 1;
    return {
      scoreA: d.sets?.[set]?.puntos_a || 0,
      scoreB: d.sets?.[set]?.puntos_b || 0,
      subScoreA: d.sets_a || 0,
      subScoreB: d.sets_b || 0,
      extra: `Set ${set}`,
      subLabel: 'Sets',
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    return (d.sets_a || 0) >= 3 || (d.sets_b || 0) >= 3;
  }

  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'puntos_a', 'puntos_b');

    if (!d.sets) d.sets = {};
    if (!d.sets[set]) d.sets[set] = { puntos_a: 0, puntos_b: 0 };
    d.sets[set][field] = (d.sets[set][field] || 0) + 1;

    return this.recalculateTotals(d);
  }

  removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'puntos_a', 'puntos_b');

    if (d.sets?.[set]) {
      d.sets[set][field] = Math.max(0, (d.sets[set][field] || 0) - 1);
    }

    return this.recalculateTotals(d);
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'puntos_a', 'puntos_b');

    if (!d.sets) d.sets = {};
    if (!d.sets[set]) d.sets[set] = { puntos_a: 0, puntos_b: 0 };
    d.sets[set][field] = Math.max(0, puntos);

    return this.recalculateTotals(d);
  }

  /** Devuelve true si el set dado ya tiene un ganador */
  private setIsWon(pA: number, pB: number): boolean {
    if (pA >= 11 && pA - pB >= 2) return true;
    if (pB >= 11 && pB - pA >= 2) return true;
    return false;
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;

    let setsA = 0;
    let setsB = 0;

    if (d.sets) {
      Object.values(d.sets).forEach((set: any) => {
        const pA = set.puntos_a || 0;
        const pB = set.puntos_b || 0;
        if (pA >= 11 && pA - pB >= 2) setsA++;
        else if (pB >= 11 && pB - pA >= 2) setsB++;
      });
    }

    d.sets_a = setsA;
    d.sets_b = setsB;

    // Auto-advance: si el set actual ya tiene ganador y el partido no terminó, avanzar
    const currentSet = d.set_actual || 1;
    const cur = d.sets?.[currentSet] || { puntos_a: 0, puntos_b: 0 };
    const matchOver = setsA >= 3 || setsB >= 3;

    if (!matchOver && this.setIsWon(cur.puntos_a || 0, cur.puntos_b || 0) && currentSet < 5) {
      d.set_actual = currentSet + 1;
      // Inicializar el nuevo set si no existe
      if (!d.sets[d.set_actual]) {
        d.sets[d.set_actual] = { puntos_a: 0, puntos_b: 0 };
      }
    }

    const activeSet = d.set_actual || 1;
    d.puntos_a = d.sets?.[activeSet]?.puntos_a || 0;
    d.puntos_b = d.sets?.[activeSet]?.puntos_b || 0;

    return d;
  }

  /** Avanza manualmente al siguiente set (máx 5); sin-op si ya terminó el partido */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    if (set < 5) {
      d.set_actual = set + 1;
      if (!d.sets[d.set_actual]) {
        d.sets[d.set_actual] = { puntos_a: 0, puntos_b: 0 };
      }
    }
    return d;
  }
}
