// ─────────────────────────────────────────────────────────────────────────────
// VoleibolService — Voleibol
// Sets a 25 pts (diff ≥ 2), 5to set a 15 pts; best-of-5 (gana con 3 sets)
// El avance de set es automático al detectar ganador; admin puede forzarlo
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

/** Puntos mínimos para ganar un set (25 salvo set corto a 15). */
function minPointsToWinVolleySet(
  setNum: number,
  sets: Record<string, { puntos_a?: number; puntos_b?: number }> | undefined
): number {
  if (setNum === 5) return 15;
  if (setNum !== 3 || !sets) return 25;
  // BO3: 3.er set decisorio a 15 (1-1 en los dos primeros)
  let a = 0;
  let b = 0;
  for (const k of [1, 2]) {
    const s = sets[k] ?? sets[String(k) as unknown as number];
    if (!s) continue;
    const pA = s.puntos_a || 0;
    const pB = s.puntos_b || 0;
    if (pA >= 25 && pA - pB >= 2) a++;
    else if (pB >= 25 && pB - pA >= 2) b++;
  }
  if (a === 1 && b === 1) return 15;
  return 25;
}

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
    const sa = d.sets_a || 0;
    const sb = d.sets_b || 0;
    if (sa >= 3 || sb >= 3) return true;
    // BO3 al mejor de 3 sets
    if (sa >= 2 || sb >= 2) return true;
    return false;
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
      const nums = Object.keys(d.sets)
        .map((k) => parseInt(k, 10))
        .filter((n) => !Number.isNaN(n) && n >= 1)
        .sort((a, b) => a - b);
      for (const setNum of nums) {
        const set = d.sets[setNum] ?? d.sets[String(setNum)];
        if (!set) continue;
        const pA = set.puntos_a || 0;
        const pB = set.puntos_b || 0;
        const minPts = minPointsToWinVolleySet(setNum, d.sets);

        if (pA >= minPts && pA - pB >= 2) setsA++;
        else if (pB >= minPts && pB - pA >= 2) setsB++;
      }
    }

    d.sets_a = setsA;
    d.sets_b = setsB;
    d.sets_total_a = setsA;
    d.sets_total_b = setsB;

    // Sincronizar el set actual a la raíz (facilidad de lectura y compatibilidad)
    const currentSet = d.set_actual || 1;
    const cur = d.sets?.[currentSet] || d.sets?.[String(currentSet)] || { puntos_a: 0, puntos_b: 0 };
    d.puntos_a = cur.puntos_a || 0;
    d.puntos_b = cur.puntos_b || 0;
    d.total_a = cur.puntos_a || 0;
    d.total_b = cur.puntos_b || 0;
    d.goles_a = setsA; // Alias: prioritize sets won for winner detection
    d.goles_b = setsB;
    const pA = cur.puntos_a || 0;
    const pB = cur.puntos_b || 0;
    const minPtsCurrent = minPointsToWinVolleySet(currentSet, d.sets);
    const setWon =
      (pA >= minPtsCurrent && pA - pB >= 2) || (pB >= minPtsCurrent && pB - pA >= 2);
    const matchOver = setsA >= 3 || setsB >= 3 || setsA >= 2 || setsB >= 2;

    if (matchOver) {
      if (setsA > setsB) d.resultado_final = 'victoria_a';
      else if (setsB > setsA) d.resultado_final = 'victoria_b';
    }

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
