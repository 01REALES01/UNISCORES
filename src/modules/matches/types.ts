// ─────────────────────────────────────────────────────────────────────────────
// Módulo Matches — Tipos centralizados
// ─────────────────────────────────────────────────────────────────────────────

// MarcadorDetalle (union estricto por deporte) se importa desde '@/modules/sports/types'
// cuando se necesita en el engine. Aquí el tipo base usa `any` para compatibilidad UI.

// ── Partido base ──────────────────────────────────────────────────────────────

export type Partido = {
  id: number;
  equipo_a: string;
  equipo_b: string;
  fecha: string;
  estado: 'programado' | 'en_curso' | 'finalizado' | 'cancelado';
  lugar?: string;
  genero?: string;
  categoria?: string;
  // Las páginas UI usan acceso dinámico (md.goles_a ?? md.total_a, etc.)
  // El union estricto MarcadorDetalle se usa en modules/sports para el engine.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  marcador_detalle: any;
  fase?: string;
  grupo?: string;
  bracket_order?: number;
  delegacion_a?: string;
  delegacion_b?: string;
  disciplina_id?: number;
  carrera_a_id?: number;
  carrera_b_id?: number;
  athlete_a_id?: string;
  athlete_b_id?: string;
  responsable_id?: string;
  last_edited_by?: string;
  updated_at?: string;
  created_at?: string;
};

// ── Partido con relaciones (joins de Supabase) ────────────────────────────────

export type PartidoWithRelations = Partido & {
  disciplinas?: { name: string; icon: string } | null;
  carrera_a?: { nombre: string; escudo_url?: string } | null;
  carrera_b?: { nombre: string; escudo_url?: string } | null;
  delegacion_a_info?: { escudo_url?: string } | null;
  delegacion_b_info?: { escudo_url?: string } | null;
  atleta_a?: { id: string; full_name: string; avatar_url?: string } | null;
  atleta_b?: { id: string; full_name: string; avatar_url?: string } | null;
  roster?: Array<{
    id: number;
    equipo_a_or_b: string;
    jugador?: { id: number; nombre: string; profile_id?: string | null } | null;
  }> | null;
};

// ── Jugador ───────────────────────────────────────────────────────────────────

export type Jugador = {
  id: number;
  nombre: string;
  numero: number | null;
  equipo: 'equipo_a' | 'equipo_b';
  partido_id?: number;
  profile_id?: string | null;
  created_at?: string;
};

// ── Evento de partido ─────────────────────────────────────────────────────────

export type TipoEvento =
  | 'gol'
  | 'punto'
  | 'punto_1'
  | 'punto_2'
  | 'punto_3'
  | 'tarjeta_amarilla'
  | 'tarjeta_roja'
  | 'expulsion_delegado'
  | 'mal_comportamiento'
  | 'inicio'
  | 'fin'
  | 'set'
  | 'cambio'
  | 'falta'
  | 'sistema'
  | string; // fallback para tipos no catalogados

export type Evento = {
  id: number;
  partido_id: number;
  tipo_evento: TipoEvento;
  minuto: number;
  equipo: 'equipo_a' | 'equipo_b' | string;
  descripcion?: string | null;
  periodo?: number | null;
  jugador_id?: number | null;
  jugador_id_normalized?: number | null;
  jugadores?: {
    id?: number;
    nombre: string;
    numero: number | null;
    profile_id?: string | null;
  } | null;
  created_at?: string;
};
