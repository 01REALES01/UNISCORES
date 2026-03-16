// ─────────────────────────────────────────────────────────────────────────────
// Sports Scoring Facade — API pública del engine de deportes
// Todas las funciones delegan al servicio registrado en getSportService()
// Reemplaza src/lib/sport-scoring.ts (608 líneas → ~100 aquí)
// ─────────────────────────────────────────────────────────────────────────────

import { getSportService } from './index';
import type { ScoreResult } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScoreDetail = Record<string, any>;
export type { ScoreResult };

// ─── Period ──────────────────────────────────────────────────────────────────

export function getPeriodDuration(deporte: string): number {
  return getSportService(deporte)?.getPeriodDuration() ?? 0;
}

export function isCountdownSport(deporte: string): boolean {
  return getSportService(deporte)?.isCountdown() ?? false;
}

export function getCurrentPeriodNumber(deporte: string, detalle: ScoreDetail): number {
  return getSportService(deporte)?.getCurrentPeriodNumber(detalle) ?? 1;
}

/** Avanza al siguiente período/set/cuarto/tiempo según el deporte */
export function nextPeriod(deporte: string, detalle: ScoreDetail): ScoreDetail {
  return getSportService(deporte)?.nextPeriod(detalle) ?? detalle;
}

// ─── Score mutations ──────────────────────────────────────────────────────────

export function addPoints(
  deporte: string,
  detalle: ScoreDetail,
  equipo: 'equipo_a' | 'equipo_b',
  puntos: number = 1,
): ScoreDetail {
  return getSportService(deporte)?.addPoints(detalle, equipo, puntos) ?? detalle;
}

export function removePoints(
  deporte: string,
  detalle: ScoreDetail,
  equipo: 'equipo_a' | 'equipo_b',
  puntos: number = 1,
): ScoreDetail {
  return getSportService(deporte)?.removePoints(detalle, equipo, puntos) ?? detalle;
}

export function setPoints(
  deporte: string,
  detalle: ScoreDetail,
  equipo: 'equipo_a' | 'equipo_b',
  puntosNuevos: number,
): ScoreDetail {
  return getSportService(deporte)?.setPoints(detalle, equipo, puntosNuevos) ?? detalle;
}

export function recalculateTotals(deporte: string, detalle: ScoreDetail): ScoreDetail {
  return getSportService(deporte)?.recalculateTotals(detalle) ?? detalle;
}

// ─── Score display ────────────────────────────────────────────────────────────

export function getCurrentScore(deporte: string, detalle: ScoreDetail): ScoreResult {
  return getSportService(deporte)?.getCurrentScore(detalle) ?? { scoreA: 0, scoreB: 0 };
}

export function isMatchFinished(deporte: string, detalle: ScoreDetail): boolean {
  return getSportService(deporte)?.isFinished(detalle) ?? false;
}

// ─── Sport-specific helpers (backwards compat) ────────────────────────────────

/**
 * Fútbol: cambia de 1er tiempo a 2do tiempo.
 * Alias de nextPeriod('Fútbol', detalle) mantenido por compatibilidad.
 */
export function cambiarTiempoFutbol(detalle: ScoreDetail): ScoreDetail {
  return nextPeriod('Fútbol', detalle);
}

/**
 * Baloncesto: avanza al siguiente cuarto.
 * Alias de nextPeriod('Baloncesto', detalle) mantenido por compatibilidad.
 */
export function cambiarCuartoBasket(detalle: ScoreDetail): ScoreDetail {
  return nextPeriod('Baloncesto', detalle);
}
