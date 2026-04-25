-- Edad opcional en perfiles (métricas admin / reportes)
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS edad integer;

COMMENT ON COLUMN public.profiles.edad IS 'Edad en años (opcional), para métricas de usuarios registrados.';

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_edad_reasonable;
ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_edad_reasonable
    CHECK (edad IS NULL OR (edad >= 14 AND edad <= 100));
