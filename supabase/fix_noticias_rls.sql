-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: RLS de noticias usaba columna 'role' (vieja) → bloqueaba lectura pública
-- Aplica esto en Supabase → SQL Editor → Run
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Eliminar las políticas rotas que referencian la columna 'role' vieja
DROP POLICY IF EXISTS "Noticias are viewable by everyone" ON noticias;

-- 2. Política de lectura pública correcta:
--    - Usuarios anónimos/autenticados: solo noticias publicadas
--    - Admins: pueden ver todas (publicadas o no)
CREATE POLICY "Noticias public read" ON noticias FOR SELECT
USING (
    published = true
    OR public.has_role(auth.uid(), 'admin')
    OR public.has_role(auth.uid(), 'data_entry')
    OR public.has_role(auth.uid(), 'periodista')
);

-- 3. Verificación rápida: debería retornar las noticias publicadas
-- SELECT count(*) FROM noticias WHERE published = true;
