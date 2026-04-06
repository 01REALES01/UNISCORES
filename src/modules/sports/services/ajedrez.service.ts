// ─────────────────────────────────────────────────────────────────────────────
// AjedrezService — Ajedrez
// Sistema de rondas: cada ronda tiene resultado 'victoria_a' | 'empate' | 'victoria_b'
// Los totales se recalculan sumando todas las rondas (1pt victoria, 0.5pt empate)
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export type AjedrezRondaResultado = 'victoria_a' | 'empate' | 'victoria_b' | null;

export type AjedrezDetalle = {
  total_a: number;
  total_b: number;
  ronda_actual: number;
  total_rondas: number;
  rondas: Record<string, { resultado: AjedrezRondaResultado }>;
};

export class AjedrezService extends BaseSportService {
  getPeriodDuration(): number { return 0; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(detalle: ScoreDetail): number {
    return (detalle as any).ronda_actual || 1;
  }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const rondaActual = d.ronda_actual || 1;
    const totalRondas = d.total_rondas || 3;
    return {
      scoreA: d.total_a || 0,
      scoreB: d.total_b || 0,
      extra: `Ronda ${rondaActual} / ${totalRondas}`,
      subLabel: 'Puntos',
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    if (!d.rondas || !d.total_rondas) return false;
    // Terminado si todas las rondas tienen resultado
    return Object.keys(d.rondas).length >= d.total_rondas &&
      Object.values(d.rondas).every((r: any) => r.resultado !== null);
  }

  /**
   * Registra el resultado de la ronda actual y avanza a la siguiente.
   * resultado: 'victoria_a' | 'empate' | 'victoria_b'
   */
  setRondaResult(detalle: ScoreDetail, resultado: AjedrezRondaResultado): ScoreDetail {
    const d = this.clone(detalle) as any;
    const rondaActual = d.ronda_actual || 1;
    const totalRondas = d.total_rondas || 3;

    if (!d.rondas) d.rondas = {};
    d.rondas[String(rondaActual)] = { resultado };

    // Avanzar ronda si no es la última
    if (rondaActual < totalRondas) {
      d.ronda_actual = rondaActual + 1;
    }

    return this.recalculateTotals(d);
  }

  /** Deshace el resultado de la ronda anterior (para correcciones) */
  undoLastRonda(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const rondaActual = d.ronda_actual || 1;

    // Si la ronda actual tiene resultado, borrarlo
    const rondasConResultado = Object.entries(d.rondas || {})
      .filter(([, v]: any) => v.resultado !== null)
      .map(([k]) => parseInt(k))
      .sort((a, b) => b - a);

    if (rondasConResultado.length === 0) return d;

    const ultimaRonda = rondasConResultado[0];
    d.rondas[String(ultimaRonda)] = { resultado: null };
    // Retroceder ronda_actual si la última ronda completada fue la anterior
    if (rondaActual > ultimaRonda) {
      d.ronda_actual = ultimaRonda;
    }

    return this.recalculateTotals(d);
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    let totalA = 0;
    let totalB = 0;

    Object.values(d.rondas || {}).forEach((r: any) => {
      if (r.resultado === 'victoria_a') totalA += 1;
      else if (r.resultado === 'victoria_b') totalB += 1;
      else if (r.resultado === 'empate') { totalA += 0.5; totalB += 0.5; }
    });

    d.total_a = totalA;
    d.total_b = totalB;
    return d;
  }

  // addPoints / removePoints / setPoints no aplican al modelo de rondas
  // pero se mantienen para compatibilidad con el engine
  addPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number = 1): ScoreDetail {
    return this.setRondaResult(detalle, equipo === 'equipo_a' ? 'victoria_a' : 'victoria_b');
  }

  removePoints(detalle: ScoreDetail, _equipo: 'equipo_a' | 'equipo_b', _puntos: number = 1): ScoreDetail {
    return this.undoLastRonda(detalle);
  }

  setPoints(detalle: ScoreDetail, equipo: 'equipo_a' | 'equipo_b', puntos: number): ScoreDetail {
    const d = this.clone(detalle) as any;
    const field = equipo === 'equipo_a' ? 'total_a' : 'total_b';
    d[field] = Math.max(0, puntos);
    return d;
  }

  /** Avanza manualmente a la siguiente ronda */
  override nextPeriod(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    const totalRondas = d.total_rondas || 3;
    if ((d.ronda_actual || 1) < totalRondas) {
      d.ronda_actual = (d.ronda_actual || 1) + 1;
    }
    return d;
  }

  /** Inicializa la estructura de rondas para un partido nuevo */
  static initDetalle(totalRondas: number = 3): AjedrezDetalle {
    const rondas: Record<string, { resultado: AjedrezRondaResultado }> = {};
    for (let i = 1; i <= totalRondas; i++) {
      rondas[String(i)] = { resultado: null };
    }
    return {
      total_a: 0,
      total_b: 0,
      ronda_actual: 1,
      total_rondas: totalRondas,
      rondas,
    };
  }
}
