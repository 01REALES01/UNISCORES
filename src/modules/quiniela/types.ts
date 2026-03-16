// ─────────────────────────────────────────────────────────────────────────────
// Módulo Quiniela — Tipos centralizados
// ─────────────────────────────────────────────────────────────────────────────

export type PredictionType = 'score' | 'winner';
export type WinnerPick = 'A' | 'B' | 'DRAW';

export type Prediction = {
  id: string;
  user_id: string;
  match_id: number;
  goles_a?: number | null;
  goles_b?: number | null;
  prediction_type?: PredictionType;
  winner_pick?: WinnerPick | null;
  puntos_ganados?: number | null;
  created_at?: string;
};

export type QuinielaLeaderboardEntry = {
  id: string;
  display_name: string;
  avatar_url?: string;
  points: number;
  correct_predictions: number;
  total_predictions: number;
  current_streak: number;
  max_streak: number;
  carreras_ids?: number[];
  tagline?: string;
};

export type MatchResult = 'A' | 'B' | 'DRAW' | null;
