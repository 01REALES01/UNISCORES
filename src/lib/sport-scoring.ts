// ─────────────────────────────────────────────────────────────────────────────
// Backwards-compat shim — re-exporta todo desde modules/sports/scoring
// Este archivo era 608 líneas; la lógica vive ahora en:
//   src/modules/sports/services/  — un servicio por deporte
//   src/modules/sports/scoring.ts — fachada pública
// ─────────────────────────────────────────────────────────────────────────────

export {
  getPeriodDuration,
  isCountdownSport,
  getCurrentPeriodNumber,
  nextPeriod,
  addPoints,
  removePoints,
  setPoints,
  recalculateTotals,
  getCurrentScore,
  isMatchFinished,
  cambiarTiempoFutbol,
  cambiarCuartoBasket,
} from '@/modules/sports/scoring';

export type { ScoreDetail, ScoreResult } from '@/modules/sports/scoring';
