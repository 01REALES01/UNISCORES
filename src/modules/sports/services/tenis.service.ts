// ─────────────────────────────────────────────────────────────────────────────
// TenisService — Tenis de Campo
// Best-of-3 (gana con 2 sets); set = 6 juegos (diff ≥ 2), 7-5, o 7-6 tiebreak
// Puntos reales por juego: 0 → 15 → 30 → 40 → DEUCE → AD → GAME
// Auto-avanza juego y set cuando corresponde
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

/**
 * Avanza el marcador de puntos dentro de un juego de tenis.
 * Representación: 0=0pts, 1=15, 2=30, 3=40, 4=ventaja
 * Deuce = pA===3 && pB===3
 * Ventaja A = pA===4, pB===3 | Ventaja B = pA===3, pB===4
 */
function avanzarPuntoJuego(
  pA: number,
  pB: number,
  ganador: 'a' | 'b',
): { pA: number; pB: number; juegoGanado: 'a' | 'b' | null } {
  const ventajaA = pA === 4 && pB === 3;
  const ventajaB = pA === 3 && pB === 4;
  const isDeuce = pA === 3 && pB === 3;

  if (ventajaA) {
    if (ganador === 'a') return { pA: 0, pB: 0, juegoGanado: 'a' };
    return { pA: 3, pB: 3, juegoGanado: null }; // vuelve a deuce
  }
  if (ventajaB) {
    if (ganador === 'b') return { pA: 0, pB: 0, juegoGanado: 'b' };
    return { pA: 3, pB: 3, juegoGanado: null };
  }
  if (isDeuce) {
    if (ganador === 'a') return { pA: 4, pB: 3, juegoGanado: null };
    return { pA: 3, pB: 4, juegoGanado: null };
  }

  // Progresión normal
  if (ganador === 'a') {
    const newPA = pA + 1;
    if (newPA >= 4) {
      // Si el otro está en 40 → deuce; si está en <40 → gana
      if (pB >= 3) return { pA: 3, pB: 3, juegoGanado: null };
      return { pA: 0, pB: 0, juegoGanado: 'a' };
    }
    return { pA: newPA, pB, juegoGanado: null };
  } else {
    const newPB = pB + 1;
    if (newPB >= 4) {
      if (pA >= 3) return { pA: 3, pB: 3, juegoGanado: null };
      return { pA: 0, pB: 0, juegoGanado: 'b' };
    }
    return { pA, pB: newPB, juegoGanado: null };
  }
}

/** Convierte el estado interno de puntos a labels visibles */
export function formatTenisPunto(pA: number, pB: number): { labelA: string; labelB: string } {
  if (pA === 3 && pB === 3) return { labelA: 'DEUCE', labelB: 'DEUCE' };
  if (pA === 4 && pB === 3)  return { labelA: 'AD', labelB: '' };
  if (pA === 3 && pB === 4)  return { labelA: '', labelB: 'AD' };
  const map: Record<number, string> = { 0: '0', 1: '15', 2: '30', 3: '40' };
  return { labelA: map[pA] ?? '0', labelB: map[pB] ?? '0' };
}

export class TenisService extends BaseSportService {
  getPeriodDuration(): number { return 0; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    return (detalle as any).set_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const set = d.set_actual || 1;
    const s = d.sets?.[set] || {};
    return {
      scoreA: s.juegos_a || 0,
      scoreB: s.juegos_b || 0,
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

  /**
   * addPoints = anotar un PUNTO real (no un juego).
   * Avanza automáticamente: punto → juego → set → set_actual.
   */
  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;

    if (!d.sets) d.sets = {};
    if (!d.sets[set]) d.sets[set] = { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 };

    const s = d.sets[set];
    const pA = s.puntos_a || 0;
    const pB = s.puntos_b || 0;
    const isTiebreak = (s.juegos_a || 0) === 6 && (s.juegos_b || 0) === 6;

    if (isTiebreak) {
      // Tiebreak: primero en 7 con ventaja ≥2
      if (equipo === 'equipo_a') s.puntos_a = pA + 1;
      else s.puntos_b = pB + 1;

      const tpA = s.puntos_a || 0;
      const tpB = s.puntos_b || 0;
      if (tpA >= 7 && tpA - tpB >= 2) {
        s.juegos_a = 7; s.juegos_b = 6; s.puntos_a = 0; s.puntos_b = 0;
      } else if (tpB >= 7 && tpB - tpA >= 2) {
        s.juegos_b = 7; s.juegos_a = 6; s.puntos_a = 0; s.puntos_b = 0;
      }
    } else {
      const ganador: 'a' | 'b' = equipo === 'equipo_a' ? 'a' : 'b';
      const result = avanzarPuntoJuego(pA, pB, ganador);
      s.puntos_a = result.pA;
      s.puntos_b = result.pB;
      if (result.juegoGanado === 'a') s.juegos_a = (s.juegos_a || 0) + 1;
      else if (result.juegoGanado === 'b') s.juegos_b = (s.juegos_b || 0) + 1;
    }

    return this.recalculateTotals(d);
  }

  removePoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'juegos_a', 'juegos_b');

    if (d.sets?.[set]) {
      d.sets[set][field] = Math.max(0, (d.sets[set][field] || 0) - 1);
      d.sets[set].puntos_a = 0;
      d.sets[set].puntos_b = 0;
    }
    return this.recalculateTotals(d);
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    const field = this.fieldFor(equipo, 'juegos_a', 'juegos_b');

    if (!d.sets) d.sets = {};
    if (!d.sets[set]) d.sets[set] = { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 };
    d.sets[set][field] = Math.max(0, puntos);
    return this.recalculateTotals(d);
  }

  private setIsWon(jA: number, jB: number): boolean {
    if ((jA === 6 && jB <= 4) || (jA === 7 && (jB === 5 || jB === 6))) return true;
    if ((jB === 6 && jA <= 4) || (jB === 7 && (jA === 5 || jA === 6))) return true;
    return false;
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;

    let setsA = 0;
    let setsB = 0;
    let gamesA = 0;
    let gamesB = 0;

    if (d.sets) {
      Object.values(d.sets).forEach((set: any) => {
        const jA = set.juegos_a || 0;
        const jB = set.juegos_b || 0;

        if ((jA === 6 && jB <= 4) || (jA === 7 && (jB === 5 || jB === 6))) setsA++;
        else if ((jB === 6 && jA <= 4) || (jB === 7 && (jA === 5 || jA === 6))) setsB++;

        gamesA += jA;
        gamesB += jB;
      });
    }

    d.sets_a = setsA;
    d.sets_b = setsB;
    d.games_a = gamesA;
    d.games_b = gamesB;

    // Auto-advance: si el set actual tiene ganador y el partido sigue, pasar al siguiente
    const currentSet = d.set_actual || 1;
    const cur = d.sets?.[currentSet] || {};
    const matchOver = setsA >= 2 || setsB >= 2;

    if (!matchOver && this.setIsWon(cur.juegos_a || 0, cur.juegos_b || 0) && currentSet < 3) {
      d.set_actual = currentSet + 1;
      if (!d.sets[d.set_actual]) {
        d.sets[d.set_actual] = { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 };
      }
    }

    return d;
  }

  /** Avanza manualmente al siguiente set (máx 3) */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const set = d.set_actual || 1;
    if (set < 3) {
      d.set_actual = set + 1;
      if (!d.sets[d.set_actual]) {
        d.sets[d.set_actual] = { juegos_a: 0, juegos_b: 0, puntos_a: 0, puntos_b: 0 };
      }
    }
    return d;
  }
}
