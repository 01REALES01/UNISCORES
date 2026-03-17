// ─────────────────────────────────────────────────────────────────────────────
// Módulo Users — Tipos centralizados
// ─────────────────────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'data_entry' | 'periodista' | 'deportista' | 'public';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AthleteStats = Record<string, any>;

export type Profile = {
  id: string;
  email: string;
  roles: UserRole[];
  full_name: string;
  avatar_url?: string;
  tagline?: string;
  about_me?: string;
  bio?: string;
  points: number;
  wins?: number;
  losses?: number;
  total_score_all_time?: number;
  carrera_id?: number;
  carreras_ids?: number[];
  athlete_disciplina_id?: number;
  athlete_stats?: AthleteStats;
  assigned_discipline_id?: number;
  disciplina?: {
    id: number;
    name: string;
    icon?: string;
  };
  is_public: boolean;
  created_at: string;
  updated_at?: string;
};

// ─────────────────────────────────────────────────────────────────────────────
// Sistema de Amigos
// ─────────────────────────────────────────────────────────────────────────────

export type FriendStatus = 'pending' | 'accepted' | 'blocked';

/** Fila de user_friends tal como viene de la DB */
export type Friendship = {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendStatus;
  created_at: string;
  updated_at: string;
};

/** Resultado de get_friends_with_profiles() */
export type FriendProfile = {
  friend_id: string;
  full_name: string;
  avatar_url?: string;
  tagline?: string;
  points: number;
  carreras_ids?: number[];
  roles: string[];
  friendship_id: string;
  since: string;
};

/** Estado de la relación del usuario actual con un perfil específico */
export type FriendRelation =
  | { status: 'none' }
  | { status: 'pending_sent';    friendship_id: string }
  | { status: 'pending_received'; friendship_id: string }
  | { status: 'accepted';        friendship_id: string }
  | { status: 'blocked';         friendship_id: string };

/** Perfil público simplificado (tabla public_profiles) */
export type PublicProfile = {
  id: string;
  email: string;
  display_name: string;
  avatar_url?: string;
  points: number;
  role?: string;
  current_streak?: number;
  max_streak?: number;
  total_predictions?: number;
  correct_predictions?: number;
  carreras_ids?: number[];
  tagline?: string;
  about_me?: string;
  created_at?: string;
};
