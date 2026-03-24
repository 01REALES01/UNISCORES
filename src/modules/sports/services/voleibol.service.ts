// ─────────────────────────────────────────────────────────────────────────────
// VoleibolService — Voleibol
// Sets a 25 pts (diff ≥ 2), 5to set a 15 pts; best-of-5 (gana con 3 sets)
// El avance de set es automático al detectar ganador; admin puede forzarlo
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export class VoleibolService extends BaseSportService {
  getPeriodDuration(): number { return 0; } // Sin límite de tiempo
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

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    
    let setsA = 0;
    let setsB = 0;

    if (d.sets) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        Object.entries(d.sets).forEach(([key, set]: [string, any]) => {
            const setNum = parseInt(key);
            const pA = set.puntos_a || 0;
            const pB = set.puntos_b || 0;
            const minPts = setNum === 5 ? 15 : 25;

            if (pA >= minPts && pA - pB >= 2) setsA++;
            else if (pB >= minPts && pB - pA >= 2) setsB++;
        });
    }

    // 🛡️ Ensure fields for DB Migration
    d.sets_a = setsA;
    d.sets_b = setsB;
    return d;
  }

  /** Avanza al siguiente set (máx 5); sin-op si ya terminó el partido */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    if (set < 5) d.set_actual = set + 1;
    return d;
  }
}
