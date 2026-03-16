// ─────────────────────────────────────────────────────────────────────────────
// NatacionService — Natación
// Modelo de carrera: no hay marcador A vs B, sino clasificación individual
// addPoints / removePoints son no-ops (sin concepto de equipo)
// La UI usa setParticipantTime() y getResults() para gestionar la clasificación
// ─────────────────────────────────────────────────────────────────────────────

import type { ScoreDetail, ScoreResult } from '@/modules/sports/types';
import { BaseSportService } from './base-sport.service';

export interface ParticipanteCarrera {
  carrera: string;   // nombre del equipo/facultad
  nombre: string;    // nombre del nadador
  tiempo?: string;   // "MM:SS.cc" — undefined si aún no terminó
  puesto?: number;   // calculado por getResults()
}

export class NatacionService extends BaseSportService {
  getPeriodDuration(): number { return 0; }
  isCountdown(): boolean { return false; }

  getCurrentPeriodNumber(_detalle: ScoreDetail): number { return 1; }

  getCurrentScore(detalle: ScoreDetail): ScoreResult {
    const d = detalle as any;
    const participantes: ParticipanteCarrera[] = d.participantes || [];
    const terminaron = participantes.filter(p => p.tiempo).length;
    const total = participantes.length;
    return {
      scoreA: terminaron,
      scoreB: total,
      extra: d.distancia || '',
      subLabel: `${terminaron}/${total} clasificados`,
    };
  }

  isFinished(detalle: ScoreDetail): boolean {
    const d = detalle as any;
    const participantes: ParticipanteCarrera[] = d.participantes || [];
    return participantes.length > 0 && participantes.every(p => !!p.tiempo);
  }

  /** No aplica al modelo de carrera — sin-op con advertencia */
  addPoints(detalle: ScoreDetail, _equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[NatacionService] addPoints no aplica al modelo de carrera; usa setParticipantTime()');
    }
    return this.clone(detalle);
  }

  /** No aplica al modelo de carrera — sin-op con advertencia */
  removePoints(detalle: ScoreDetail, _equipo: 'equipo_a' | 'equipo_b'): ScoreDetail {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[NatacionService] removePoints no aplica al modelo de carrera; usa setParticipantTime()');
    }
    return this.clone(detalle);
  }

  /** No aplica al modelo de carrera — sin-op con advertencia */
  setPoints(detalle: ScoreDetail, _equipo: 'equipo_a' | 'equipo_b', _puntos: number): ScoreDetail {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[NatacionService] setPoints no aplica al modelo de carrera; usa setParticipantTime()');
    }
    return this.clone(detalle);
  }

  recalculateTotals(detalle: ScoreDetail): ScoreDetail {
    return this.getResults(detalle);
  }

  /**
   * Establece (o actualiza) el tiempo de un participante.
   * @param nombre Nombre del nadador (identificador único en la carrera)
   * @param tiempo Tiempo en formato "MM:SS.cc" (e.g., "00:54.32")
   */
  setParticipantTime(detalle: ScoreDetail, nombre: string, tiempo: string): ScoreDetail {
    const d = this.clone(detalle) as any;
    if (!d.participantes) d.participantes = [];

    const idx = (d.participantes as ParticipanteCarrera[]).findIndex(p => p.nombre === nombre);
    if (idx >= 0) {
      d.participantes[idx].tiempo = tiempo;
    } else {
      d.participantes.push({ carrera: '', nombre, tiempo });
    }

    return this.getResults(d);
  }

  /**
   * Recalcula puestos ordenando por tiempo (menor = mejor).
   * Participantes sin tiempo quedan al final sin puesto asignado.
   */
  getResults(detalle: ScoreDetail): ScoreDetail {
    const d = this.clone(detalle) as any;
    if (!d.participantes) return d;

    const participantes: ParticipanteCarrera[] = d.participantes;
    const conTiempo = participantes
      .filter(p => !!p.tiempo)
      .sort((a, b) => (a.tiempo! < b.tiempo! ? -1 : a.tiempo! > b.tiempo! ? 1 : 0));

    let puesto = 1;
    conTiempo.forEach(p => { p.puesto = puesto++; });

    participantes
      .filter(p => !p.tiempo)
      .forEach(p => { p.puesto = undefined; });

    d.participantes = participantes;
    return d;
  }
}
