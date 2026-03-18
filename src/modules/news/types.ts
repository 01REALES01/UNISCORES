// ─────────────────────────────────────────────────────────────────────────────
// Módulo News — Tipos centralizados
// ─────────────────────────────────────────────────────────────────────────────

export type NoticiaCategoria = 'cronica' | 'entrevista' | 'analisis' | 'flash';

export type Noticia = {
  id: string;
  titulo: string;
  contenido: string;
  imagen_url: string | null;
  categoria: NoticiaCategoria;
  autor_nombre: string;
  partido_id?: number | null;
  carrera?: string | null;
  published: boolean;
  created_at: string;
  updated_at?: string;
  // Joined relations
  partidos?: {
    id?: number;
    equipo_a: string;
    equipo_b: string;
    fecha?: string;
    estado?: string;
    lugar?: string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    marcador_detalle?: any;
    disciplinas: { name: string; icon?: string };
    carrera_a?: { nombre: string; escudo_url?: string } | null;
    carrera_b?: { nombre: string; escudo_url?: string } | null;
  } | null;
};

export type NewsReaction = {
  id: string;
  noticia_id: string;
  user_id: string;
  emoji: string;
  created_at?: string;
};
