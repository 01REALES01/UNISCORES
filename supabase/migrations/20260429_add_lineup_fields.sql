ALTER TABLE public.roster_partido
  ADD COLUMN IF NOT EXISTS posicion TEXT;

ALTER TABLE public.partidos
  ADD COLUMN IF NOT EXISTS formacion_a TEXT,
  ADD COLUMN IF NOT EXISTS formacion_b TEXT;
