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
    const setsA = d.sets_total_a ?? d.sets_a ?? 0;
    const setsB = d.sets_total_b ?? d.sets_b ?? 0;
    const s = d.sets?.[set] || {};
    const pA = s.puntos_a ?? d.puntos_a ?? d.total_a ?? d.goles_a ?? 0;
    const pB = s.puntos_b ?? d.puntos_b ?? d.total_b ?? d.goles_b ?? 0;

    return {
      scoreA: setsA,
      scoreB: setsB,
      subScoreA: pA,
      subScoreB: pB,
      extra: `Set ${set} · ${pA}–${pB}`,
      subLabel: 'PTS',
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

    d.sets_a = setsA;
    d.sets_b = setsB;
    d.sets_total_a = setsA;
    d.sets_total_b = setsB;

    // Sincronizar el set actual a la raíz (facilidad de lectura y compatibilidad)
    const currentSet = d.set_actual || 1;
    const cur = d.sets?.[currentSet] || { puntos_a: 0, puntos_b: 0 };
    d.puntos_a = cur.puntos_a || 0;
    d.puntos_b = cur.puntos_b || 0;
    d.total_a = cur.puntos_a || 0;
    d.total_b = cur.puntos_b || 0;
    d.goles_a = cur.puntos_a || 0; // alias
    d.goles_b = cur.puntos_b || 0;
    const pA = cur.puntos_a || 0;
    const pB = cur.puntos_b || 0;
    const minPts = currentSet === 5 ? 15 : 25;
    const setWon = (pA >= minPts && pA - pB >= 2) || (pB >= minPts && pB - pA >= 2);
    const matchOver = setsA >= 3 || setsB >= 3;

    if (!matchOver && setWon && currentSet < 5) {
      d.set_actual = currentSet + 1;
      if (!d.sets) d.sets = {};
      if (!d.sets[d.set_actual]) {
        d.sets[d.set_actual] = { puntos_a: 0, puntos_b: 0 };
      }
    }

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
