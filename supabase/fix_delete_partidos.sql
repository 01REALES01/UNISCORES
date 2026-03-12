-- SCRIPT PARA ARREGLAR LA ELIMINACIÓN DE PARTIDOS
-- Este script soluciona los dos problemas comunes que impiden borrar partidos:
-- 1. Políticas de Seguridad (RLS) que no permitían a admins/data_entry borrar
-- 2. Claves foráneas (Foreign Keys) sin "ON DELETE CASCADE"

---------------------------------------------------------
-- PASO 1: ARREGLAR POLÍTICAS RLS (Seguridad)
---------------------------------------------------------
-- Primero eliminamos cualquier política restrictiva vieja
DROP POLICY IF EXISTS "Admins can delete partidos" ON partidos;
DROP POLICY IF EXISTS "Admins and Data Entry can delete partidos" ON partidos;
DROP POLICY IF EXISTS "Enable delete for admin and data_entry" ON partidos;

-- Creamos una política robusta que permite a un auth.uid() con rol admin o data_entry borrar:
CREATE POLICY "Admins and Data Entry can delete partidos" ON partidos FOR DELETE USING (
  EXISTS(
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'data_entry')
  )
);

---------------------------------------------------------
-- PASO 2: ARREGLAR CASCADAS EN DEPENDENCIAS
---------------------------------------------------------
-- A. PRONOSTICOS
ALTER TABLE pronosticos DROP CONSTRAINT IF EXISTS pronosticos_match_id_fkey;
ALTER TABLE pronosticos ADD CONSTRAINT pronosticos_match_id_fkey FOREIGN KEY (match_id) REFERENCES partidos(id) ON DELETE CASCADE;

-- B. OLYMPICS_EVENTOS
ALTER TABLE olympics_eventos DROP CONSTRAINT IF EXISTS olympics_eventos_partido_id_fkey;
ALTER TABLE olympics_eventos ADD CONSTRAINT olympics_eventos_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;

-- C. OLYMPICS_JUGADORES
ALTER TABLE olympics_jugadores DROP CONSTRAINT IF EXISTS olympics_jugadores_partido_id_fkey;
ALTER TABLE olympics_jugadores ADD CONSTRAINT olympics_jugadores_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;

-- D. EVENTOS_PARTIDO (si existe)
ALTER TABLE IF EXISTS eventos_partido DROP CONSTRAINT IF EXISTS eventos_partido_partido_id_fkey;
ALTER TABLE IF EXISTS eventos_partido ADD CONSTRAINT eventos_partido_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;

-- E. JUGADORES (si existe)
ALTER TABLE IF EXISTS jugadores DROP CONSTRAINT IF EXISTS jugadores_partido_id_fkey;
ALTER TABLE IF EXISTS jugadores ADD CONSTRAINT jugadores_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE CASCADE;

-- F. NOTICIAS (Hacer NULL el partido referenciado para no borrar la noticia si se borra el partido)
ALTER TABLE noticias DROP CONSTRAINT IF EXISTS noticias_partido_id_fkey;
ALTER TABLE noticias ADD CONSTRAINT noticias_partido_id_fkey FOREIGN KEY (partido_id) REFERENCES partidos(id) ON DELETE SET NULL;

---------------------------------------------------------
-- FINALIZADO 
---------------------------------------------------------
