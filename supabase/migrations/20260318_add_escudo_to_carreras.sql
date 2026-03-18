-- Migración: Añadir escudo (imagen) a cada carrera
-- Fecha: 2026-03-18

ALTER TABLE public.carreras ADD COLUMN IF NOT EXISTS escudo_url text;

COMMENT ON COLUMN public.carreras.escudo_url IS 'URL pública del escudo/logo de la carrera, almacenado en Supabase Storage (bucket avatars, carpeta carreras/)';
