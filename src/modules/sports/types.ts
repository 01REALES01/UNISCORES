// ─────────────────────────────────────────────────────────────────────────────
// Módulo Sports — Tipos centralizados
// Incluye el union discriminado de MarcadorDetalle, ISportService y ScoreResult
// ─────────────────────────────────────────────────────────────────────────────

// ── Tipos de marcador por deporte ────────────────────────────────────────────

export type MarcadorFutbol = {
  goles_a: number;
  goles_b: number;
  tiempo_actual?: 1 | 2;
  minuto_actual?: number;
  tiempos?: Record<number, { goles_a: number; goles_b: number }>;
  tiempo_inicio?: string;
  estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
};

export type MarcadorBaloncesto = {
  total_a: number;
  total_b: number;
  cuarto_actual?: number; // 1-4, >4 = prórroga
  cuartos?: Record<number, { puntos_a: number; puntos_b: number }>;
  tiempo_inicio?: string;
  estado_cronometro?: 'corriendo' | 'pausado' | 'detenido';
};

/** Voleibol y Tenis de Mesa (puntos en sets) */
export type MarcadorSets = {
  sets_a: number;
  sets_b: number;
  set_actual?: number;
  sets?: Record<number, { puntos_a: number; puntos_b: number }>;
};

/** Tenis de campo (juegos en sets) */
export type MarcadorTenis = {
  sets_a: number;
  sets_b: number;
  set_actual?: number;
  sets?: Record<number, { juegos_a: number; juegos_b: number }>;
};

/** Natación — modelo carrera multi-participante */
export type MarcadorCarrera = {
  tipo: 'carrera';
  distancia?: string;
  estilo?: string;
  participantes?: Array<{
    carrera: string;
    nombre: string;
    tiempo?: string;
    puesto?: number;
  }>;
};

/** Ajedrez — resultado simple */
export type MarcadorAjedrez = {
  total_a: number;
  total_b: number;
  rondas?: number;
};

/** Union discriminada — cubre todos los deportes */
export type MarcadorDetalle =
  | MarcadorFutbol
  | MarcadorBaloncesto
  | MarcadorSets
  | MarcadorTenis
  | MarcadorCarrera
  | MarcadorAjedrez;

// ── ScoreDetail flexible para el engine interno ───────────────────────────────

/** Usado internamente en el engine de scoring; más permisivo que MarcadorDetalle */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ScoreDetail = MarcadorDetalle | Record<string, any>;

// ── ScoreResult ───────────────────────────────────────────────────────────────

export type ScoreResult = {
  scoreA: number;
  scoreB: number;
  /** Puntos del sub-período actual (set, cuarto, tiempo) */
  subScoreA?: number;
  subScoreB?: number;
  /** Label del período actual (ej. "1º Tiempo", "Cuarto 2", "Set 3") */
  extra?: string;
  /** Label corto del sub-score (ej. "Pts", "Goles") */
  subLabel?: string;
};

// ── ISportService ─────────────────────────────────────────────────────────────

export interface ISportService {
  getPeriodDuration(): number;
  isCountdown(): boolean;
  getCurrentPeriodNumber(detalle: ScoreDetail): number;
  getCurrentScore(detalle: ScoreDetail): ScoreResult;
  isFinished(detalle: ScoreDetail): boolean;

  addPoints(
    detalle: ScoreDetail,
    equipo: 'equipo_a' | 'equipo_b',
    puntos?: number
  ): ScoreDetail;
  removePoints(
    detalle: ScoreDetail,
    equipo: 'equipo_a' | 'equipo_b',
    puntos?: number
  ): ScoreDetail;
  setPoints(
    detalle: ScoreDetail,
    equipo: 'equipo_a' | 'equipo_b',
    puntos: number
  ): ScoreDetail;
  recalculateTotals(detalle: ScoreDetail): ScoreDetail;
  /** Avanza al siguiente período (tiempo, cuarto, set, ronda) */
  nextPeriod(detalle: ScoreDetail): ScoreDetail;
}
