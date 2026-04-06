-- ─────────────────────────────────────────────────────────────────────────────
-- 20260405_jugadores_self_link_policy.sql
-- Permite que un usuario autenticado vincule su profile_id a su propio jugador
-- cuando el email del jugador coincide con el email del usuario registrado.
-- Necesario para que auth/callback pueda auto-vincular sin service role key.
-- ─────────────────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Users can self-link their jugador profile" ON public.jugadores;
CREATE POLICY "Users can self-link their jugador profile"
    ON public.jugadores FOR UPDATE
    USING (
        -- Solo permite actualizar filas cuyo email coincide con el del usuario autenticado
        email = auth.email()
    )
    WITH CHECK (
        -- Solo permite poner profile_id = su propio uid (no puede sobreescribir otro)
        profile_id = auth.uid()
        AND email = auth.email()
    );
