-- ==========================================
-- SCRIPT DE ACTUALIZACIÓN: PERMISOS GLOBALES DATA ENTRY
-- ==========================================
-- Este script permite que los usuarios con rol 'data_entry'
-- tengan permisos globales de lectura y escritura sobre
-- todos los partidos y noticias, sin necesidad de ser
-- asignados como responsables individuales.
-- ==========================================

-- 1. PARTIDOS: Sustituir las políticas de Inserción, Actualización y Borrado

DROP POLICY IF EXISTS "Admins can insert partidos" ON partidos;
CREATE POLICY "Admins and Data Entry can insert partidos" ON partidos FOR INSERT 
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') );

DROP POLICY IF EXISTS "Admins and assigned Data Entry can update partidos" ON partidos;
DROP POLICY IF EXISTS "Data Entry can update own matches" ON partidos;
CREATE POLICY "Admins and Data Entry can update partidos" ON partidos FOR UPDATE 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') );

DROP POLICY IF EXISTS "Admins can delete partidos" ON partidos;
CREATE POLICY "Admins and Data Entry can delete partidos" ON partidos FOR DELETE 
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') );


-- 2. NOTICIAS: Sustituir las políticas de Mutación para permitir Data Entry

DROP POLICY IF EXISTS "Admins can modify noticias" ON noticias;
CREATE POLICY "Admins and Data Entry can modify noticias" ON noticias FOR ALL
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') );


-- 3. OLYMPICS_EVENTOS y OLYMPICS_JUGADORES (Las tablas que usan los modales de partido)
-- Aseguramos que RLS esté activo y tenga la misma regla global

ALTER TABLE olympics_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE olympics_jugadores ENABLE ROW LEVEL SECURITY;

-- Limpiar previas si existen
DROP POLICY IF EXISTS "Public can view olympics_eventos" ON olympics_eventos;
DROP POLICY IF EXISTS "Admins and Data Entry can modify olympics_eventos" ON olympics_eventos;
DROP POLICY IF EXISTS "Public can view olympics_jugadores" ON olympics_jugadores;
DROP POLICY IF EXISTS "Admins and Data Entry can modify olympics_jugadores" ON olympics_jugadores;

-- EVENTOS
CREATE POLICY "Public can view olympics_eventos" ON olympics_eventos FOR SELECT USING (true);
CREATE POLICY "Admins and Data Entry can modify olympics_eventos" ON olympics_eventos FOR ALL
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') );

-- JUGADORES
CREATE POLICY "Public can view olympics_jugadores" ON olympics_jugadores FOR SELECT USING (true);
CREATE POLICY "Admins and Data Entry can modify olympics_jugadores" ON olympics_jugadores FOR ALL
USING ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') )
WITH CHECK ( (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'data_entry') );

-- ==========================================
-- FIN DEL SCRIPT DE ACTUALIZACIÓN
-- ==========================================
