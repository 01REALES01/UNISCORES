// ─────────────────────────────────────────────────────────────────────────────
// Módulo Medallero — Tipos centralizados
// ─────────────────────────────────────────────────────────────────────────────

export type MedalEntry = {
  id: number;
  equipo_nombre: string;
  carrera_id?: number;
  oro: number;
  plata: number;
  bronce: number;
  puntos: number;
  won?: number;
  draw?: number;
  lost?: number;
  played?: number;
  updated_at?: string;
};
