-- Allow admins/data_entry to update and delete roster at any match state.
-- The previous policy blocked UPDATE/DELETE when estado != 'programado'.

DROP POLICY IF EXISTS "Can update roster only if match is programado" ON public.roster_partido;
CREATE POLICY "Can update roster only if match is programado"
    ON public.roster_partido FOR UPDATE
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'data_entry')
        OR public.has_role(auth.uid(), 'creator')
    );

DROP POLICY IF EXISTS "Can delete roster only if match is programado" ON public.roster_partido;
CREATE POLICY "Can delete roster only if match is programado"
    ON public.roster_partido FOR DELETE
    USING (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'data_entry')
        OR public.has_role(auth.uid(), 'creator')
    );
