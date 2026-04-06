-- ─────────────────────────────────────────────────────────────────────────────
-- 20260402_add_email_to_jugadores.sql
-- Agrega campo email a jugadores para vincular automáticamente con profiles
-- al momento del registro del estudiante
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE public.jugadores
    ADD COLUMN IF NOT EXISTS email TEXT;

COMMENT ON COLUMN public.jugadores.email IS
    'Email del jugador para vinculación automática con profile cuando se registre';

-- Índice para búsqueda rápida por email durante login/registro
CREATE INDEX IF NOT EXISTS idx_jugadores_email
    ON public.jugadores (email)
    WHERE email IS NOT NULL;
