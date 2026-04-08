-- Migration: Add escudo_url to delegaciones for consistent icon display
-- Date: 2026-04-08

-- 1. Add the column
ALTER TABLE public.delegaciones 
ADD COLUMN IF NOT EXISTS escudo_url TEXT;

-- 2. Backfill escudo_url from the first valid career in the carrera_ids array
-- This ensures that fusions show the icon of their first representative career.
UPDATE public.delegaciones d
SET escudo_url = c.escudo_url
FROM public.carreras c
WHERE c.id = d.carrera_ids[1] -- Postgres arrays are 1-indexed
  AND d.escudo_url IS NULL;

-- 3. Additional fallback: if carrera_ids was empty but matches exist, 
-- try to find a career icon that matches the delegation name (some older data might need this)
UPDATE public.delegaciones d
SET escudo_url = c.escudo_url
FROM public.carreras c
WHERE d.escudo_url IS NULL
  AND c.nombre = d.nombre;

COMMENT ON COLUMN public.delegaciones.escudo_url IS 'Representative icon/shield for the team. Automatically backfilled from the first associated career.';
