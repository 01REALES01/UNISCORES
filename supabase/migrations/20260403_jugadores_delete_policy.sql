-- ─────────────────────────────────────────────────────────────────────────────
-- 20260403_jugadores_delete_policy.sql
-- Agrega RLS policy para permitir que admins eliminen jugadores
-- ─────────────────────────────────────────────────────────────────────────────

CREATE POLICY "Admins can delete jugadores"
    ON public.jugadores FOR DELETE
    USING (public.has_role(auth.uid(), 'admin'));
