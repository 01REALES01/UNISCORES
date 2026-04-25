-- Sexo y género (rama) en perfiles — métricas admin y registro
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS sexo TEXT;

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS genero TEXT;

COMMENT ON COLUMN public.profiles.sexo IS 'Sexo / etiqueta M, F, etc. (opcional). Puede venir de OAuth o de jugadores vinculados.';
COMMENT ON COLUMN public.profiles.genero IS 'Rama deportiva: masculino / femenino / mixto cuando aplica (opcional).';
