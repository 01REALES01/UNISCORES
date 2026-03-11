-- Archivo: patch_periodista_role.sql
-- Descripción: Otorga permisos globales de mutación a usuarios con rol 'periodista'
-- estrictamente limitados a la tabla 'noticias'. No tienen acceso a editar partidos.

-- 1. Agregar el nuevo rol 'periodista' al tipo enum 'user_role'
-- (Esto evita el error 22P02: invalid input value for enum user_role)
-- PostgreSQL requiere COMMIT después de alterar un ENUM si se usará enseguida en el mismo script
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'periodista';
COMMIT;
-- NOTICIAS: admin, data_entry, y ahora periodista
DROP POLICY IF EXISTS "Permitir insert a staff" ON noticias;
DROP POLICY IF EXISTS "Permitir update a staff" ON noticias;
DROP POLICY IF EXISTS "Permitir delete a staff" ON noticias;

CREATE POLICY "Permitir insert a staff" ON noticias
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'data_entry', 'periodista')
        )
    );

CREATE POLICY "Permitir update a staff" ON noticias
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'data_entry', 'periodista')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'data_entry', 'periodista')
        )
    );

CREATE POLICY "Permitir delete a staff" ON noticias
    FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE id = auth.uid() AND role IN ('admin', 'data_entry', 'periodista')
        )
    );
