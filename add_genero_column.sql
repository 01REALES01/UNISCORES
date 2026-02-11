-- Agregar columna genero a la tabla partidos
-- Ejecutar este script en el SQL Editor de Supabase Dashboard

ALTER TABLE partidos 
ADD COLUMN IF NOT EXISTS genero text DEFAULT 'masculino';

-- Verificar que se creó correctamente
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'partidos' AND column_name = 'genero';
