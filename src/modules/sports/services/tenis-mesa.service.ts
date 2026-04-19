// ─────────────────────────────────────────────────────────────────────────────
// TenisMesaService — Tenis de Mesa (Ping-Pong)
// Sets a 11 pts (diff ≥ 2); best-of-3 (gana con 2 sets, máx 3 sets)
// En 10-10 se juega a diferencia de 2 (cubierto por la condición diff ≥ 2)
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
    const setsA = d.sets_total_a ?? d.sets_a ?? 0;
    const setsB = d.sets_total_b ?? d.sets_b ?? 0;
    const s =
      d.sets?.[set] ??
      d.sets?.[String(set)] ??
      {};
    const pA = s.puntos_a ?? d.puntos_a ?? d.total_a ?? d.goles_a ?? 0;
    const pB = s.puntos_b ?? d.puntos_b ?? d.total_b ?? d.goles_b ?? 0;

    // Misma convención que Voleibol / tarjetas partidos: score = sets ganados, sub = rally del set actual.
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
    return (d.sets_a || 0) >= 2 || (d.sets_b || 0) >= 2;
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
    d.sets_total_a = setsA;
    d.sets_total_b = setsB;
    
    // Almacenar el score del set actual en la raíz (compatibilidad y facilidad de lectura)
    const currentSet = d.set_actual || 1;
    const cur = d.sets?.[currentSet] || { puntos_a: 0, puntos_b: 0 };
    d.puntos_a = cur.puntos_a || 0;
    d.puntos_b = cur.puntos_b || 0;
    d.total_a = cur.puntos_a || 0;
    d.total_b = cur.puntos_b || 0;
    d.goles_a = cur.puntos_a || 0; // alias
    d.goles_b = cur.puntos_b || 0;
    const matchOver = setsA >= 2 || setsB >= 2;

    if (!matchOver && this.setIsWon(cur.puntos_a || 0, cur.puntos_b || 0) && currentSet < 3) {
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

  /** Avanza manualmente al siguiente set (máx 3); sin-op si ya terminó el partido */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    if (set < 3) {
      d.set_actual = set + 1;
      if (!d.sets[d.set_actual]) {
        d.sets[d.set_actual] = { puntos_a: 0, puntos_b: 0 };
      }
    }
    return d;
  }
}
