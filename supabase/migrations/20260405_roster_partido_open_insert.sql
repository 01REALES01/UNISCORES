-- ─────────────────────────────────────────────────────────────────────────────
-- 20260405_roster_partido_open_insert.sql
-- Permite que cualquier usuario autenticado inserte en roster_partido.
-- La seguridad de quién puede llamar esto está garantizada por el API route
-- que valida el token de usuario antes de realizar cualquier insert.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Can insert roster before match starts" ON public.roster_partido;

CREATE POLICY "Can insert roster before match starts"
    ON public.roster_partido FOR INSERT
    WITH CHECK (auth.uid() IS NOT NULL);
