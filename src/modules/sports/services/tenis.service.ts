// ─────────────────────────────────────────────────────────────────────────────
// TenisService — Tenis de Campo
// Best-of-3 (gana con 2 sets); set = 6 juegos (diff ≥ 2), 7-5, o 7-6 tiebreak
// La unidad de control es el JUEGO (game), no el punto
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export class TenisService extends BaseSportService {
  getPeriodDuration(): number { return 0; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    return (detalle as any).set_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const set = d.set_actual || 1;
    return {
      scoreA: d.sets?.[set]?.juegos_a || 0,
      scoreB: d.sets?.[set]?.juegos_b || 0,
      subScoreA: d.sets_a || 0,
      subScoreB: d.sets_b || 0,
      extra: `Set ${set}`,
      subLabel: 'Sets',
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    return (d.sets_a || 0) >= 2 || (d.sets_b || 0) >= 2;
  }

  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'juegos_a', 'juegos_b');

    if (!d.sets) d.sets = {};
    if (!d.sets[set]) d.sets[set] = { juegos_a: 0, juegos_b: 0 };
    d.sets[set][field] = (d.sets[set][field] || 0) + 1;

    return this.recalculateTotals(d);
  }

  removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'juegos_a', 'juegos_b');

    if (d.sets?.[set]) {
      d.sets[set][field] = Math.max(0, (d.sets[set][field] || 0) - 1);
    }

    return this.recalculateTotals(d);
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'juegos_a', 'juegos_b');

    if (!d.sets) d.sets = {};
    if (!d.sets[set]) d.sets[set] = { juegos_a: 0, juegos_b: 0 };
    d.sets[set][field] = Math.max(0, puntos);

    return this.recalculateTotals(d);
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    if (!d.sets || Object.keys(d.sets).length === 0) return d;

    let setsA = 0;
    let setsB = 0;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Object.values(d.sets).forEach((set: any) => {
      const jA = set.juegos_a || 0;
      const jB = set.juegos_b || 0;

      // 6-0..6-4, 7-5, 7-6 (tiebreak)
      if ((jA === 6 && jB <= 4) || (jA === 7 && (jB === 5 || jB === 6))) setsA++;
      else if ((jB === 6 && jA <= 4) || (jB === 7 && (jA === 5 || jA === 6))) setsB++;
    });

    d.sets_a = setsA;
    d.sets_b = setsB;
    
    // 🛡️ Harmonize with DB Migration (validate_marcador expects games_a/b)
    let gamesA = 0;
    let gamesB = 0;
    Object.values(d.sets || {}).forEach((set: any) => {
      gamesA += set.juegos_a || 0;
      gamesB += set.juegos_b || 0;
    });
    d.games_a = gamesA;
    d.games_b = gamesB;

    return d;
  }

  /** Avanza al siguiente set (máx 3); sin-op si ya terminó el partido */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    if (set < 3) d.set_actual = set + 1;
    return d;
  }
}
