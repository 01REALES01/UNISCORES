-- Añadir columnas faltantes a la tabla partidos
-- Ejecutar en Supabase SQL Editor

-- Columna de lugar (si no existe)
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS lugar TEXT DEFAULT 'Coliseo Central';

-- Columna de género/categoría
ALTER TABLE partidos ADD COLUMN IF NOT EXISTS genero TEXT DEFAULT 'masculino' CHECK (genero IN ('masculino', 'femenino', 'mixto'));
