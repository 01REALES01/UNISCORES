-- =====================================================
-- Add delegacion_id override to jugadores
-- =====================================================
-- Allows individual "loose" players to be permanently
-- assigned to a specific delegation, bypassing the
-- carrera-based delegation lookup.
-- =====================================================

ALTER TABLE public.jugadores
  ADD COLUMN IF NOT EXISTS delegacion_id BIGINT
  REFERENCES public.delegaciones(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jugadores_delegacion_id
  ON public.jugadores(delegacion_id);
