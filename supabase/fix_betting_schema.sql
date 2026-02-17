-- ASEGURAR COLUMNAS PARA APUESTAS
-- Ejecuta este script en el Editor SQL de Supabase para arreglar el error de envío

-- 1. Permitir nulos en goles (necesario para modo 'Ganador')
ALTER TABLE pronosticos ALTER COLUMN goles_a DROP NOT NULL;
ALTER TABLE pronosticos ALTER COLUMN goles_b DROP NOT NULL;

-- 2. Asegurar que las columnas nuevas existen
ALTER TABLE pronosticos ADD COLUMN IF NOT EXISTS prediction_type text DEFAULT 'score';
ALTER TABLE pronosticos ADD COLUMN IF NOT EXISTS winner_pick text;

-- 3. Verificar permisos (opcional, pero ayuda)
GRANT ALL ON TABLE pronosticos TO authenticated;
GRANT ALL ON TABLE pronosticos TO service_role;
