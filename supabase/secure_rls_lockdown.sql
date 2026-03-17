-- ==========================================
-- SCRIPT DE SEGURIDAD CRÍTICA (RLS LOCKDOWN)
-- ==========================================
-- Este script cierra la vulnerabilidad de "Modo Demo"
-- donde cualquier persona con la url pública podía
-- modificar partidos y noticias.
-- ==========================================

-- 1. Eliminar las políticas inseguras (Modo Demo)
DROP POLICY IF EXISTS "Enable insert for everyone" ON partidos;
DROP POLICY IF EXISTS "Enable update for everyone" ON partidos;
DROP POLICY IF EXISTS "Admins can insert news" ON noticias;
DROP POLICY IF EXISTS "Admins can update news" ON noticias;
DROP POLICY IF EXISTS "Admins can delete news" ON noticias;
DROP POLICY IF EXISTS "Enable delete for everyone" ON partidos; -- Por si acaso

-- 2. Asegurarnos que RLS está activo
ALTER TABLE partidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE noticias ENABLE ROW LEVEL SECURITY;
ALTER TABLE carreras ENABLE ROW LEVEL SECURITY;
ALTER TABLE disciplinas ENABLE ROW LEVEL SECURITY;

-- 3. Crear Políticas Seguras para PARTIDOS
-- Lectura pública
DROP POLICY IF EXISTS "Partidos are viewable by everyone" ON partidos;
CREATE POLICY "Partidos are viewable by everyone" ON partidos FOR SELECT USING (true);

-- Inserción/Borrado solo para ADMINS
DROP POLICY IF EXISTS "Admins can insert partidos" ON partidos;
CREATE POLICY "Admins can insert partidos" ON partidos FOR INSERT
WITH CHECK ( public.has_role(auth.uid(), 'admin') );

DROP POLICY IF EXISTS "Admins can delete partidos" ON partidos;
CREATE POLICY "Admins can delete partidos" ON partidos FOR DELETE
USING ( public.has_role(auth.uid(), 'admin') );

-- Actualización para ADMINS y DATA ENTRY asignados
DROP POLICY IF EXISTS "Data Entry can update own matches" ON partidos;
DROP POLICY IF EXISTS "Admins and assigned Data Entry can update partidos" ON partidos;
CREATE POLICY "Admins and assigned Data Entry can update partidos" ON partidos FOR UPDATE
USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'data_entry')
    OR auth.uid() = responsable_id
);

-- 4. Crear Políticas Seguras para NOTICIAS
-- Lectura pública (solo publicadas, o staff ve todas)
DROP POLICY IF EXISTS "Noticias are viewable by everyone" ON noticias;
DROP POLICY IF EXISTS "Noticias public read" ON noticias;
CREATE POLICY "Noticias are viewable by everyone" ON noticias FOR SELECT
USING (
    published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'data_entry')
    OR public.has_role(auth.uid(), 'periodista')
);

-- Mutaciones solo para ADMINS y staff editorial
DROP POLICY IF EXISTS "Admins can modify noticias" ON noticias;
CREATE POLICY "Admins can modify noticias" ON noticias FOR ALL
USING (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'data_entry')
    OR public.has_role(auth.uid(), 'periodista')
)
WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'data_entry')
    OR public.has_role(auth.uid(), 'periodista')
);

-- 5. Crear Políticas Seguras para CARRERAS y DISCIPLINAS (Catálogos)
-- Lectura pública
DROP POLICY IF EXISTS "Carreras viewable by everyone" ON carreras;
CREATE POLICY "Carreras viewable by everyone" ON carreras FOR SELECT USING (true);

DROP POLICY IF EXISTS "Disciplinas viewable by everyone" ON disciplinas;
CREATE POLICY "Disciplinas viewable by everyone" ON disciplinas FOR SELECT USING (true);

-- Mutaciones solo admins
DROP POLICY IF EXISTS "Admins can modify carreras" ON carreras;
CREATE POLICY "Admins can modify carreras" ON carreras FOR ALL
USING ( public.has_role(auth.uid(), 'admin') );

DROP POLICY IF EXISTS "Admins can modify disciplinas" ON disciplinas;
CREATE POLICY "Admins can modify disciplinas" ON disciplinas FOR ALL
USING ( public.has_role(auth.uid(), 'admin') );

-- 6. User Favoritos (El usuario solo puede ver y editar sus propios favoritos)
ALTER TABLE user_carreras_favoritas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own favorites" ON user_carreras_favoritas;
CREATE POLICY "Users can manage their own favorites" ON user_carreras_favoritas FOR ALL
USING ( auth.uid() = user_id )
WITH CHECK ( auth.uid() = user_id );

-- ==========================================
-- FIN DEL SCRIPT DE SEGURIDAD
-- ==========================================
