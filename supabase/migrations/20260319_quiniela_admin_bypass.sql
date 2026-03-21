-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Quiniela Admin Bypass
-- Date: 2026-03-19
-- Description: Allows administrators and data_entry roles to bypass the 
--              time-based restriction for predictions.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Redefine INSERT policy
DROP POLICY IF EXISTS "Users can insert own predictions before match starts" ON public.pronosticos;
CREATE POLICY "Users can insert own predictions before match starts"
    ON public.pronosticos FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND (
            -- Bypass for admins/staff
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'data_entry')
            -- Or match still hasn't started
            OR EXISTS (
                SELECT 1 FROM public.partidos p
                WHERE p.id = match_id
                AND p.fecha > now()
            )
        )
    );

-- 2. Redefine UPDATE policy
DROP POLICY IF EXISTS "Users can update own predictions before match starts" ON public.pronosticos;
CREATE POLICY "Users can update own predictions before match starts"
    ON public.pronosticos FOR UPDATE
    USING (
        auth.uid() = user_id
        OR public.has_role(auth.uid(), 'admin')
    )
    WITH CHECK (
        auth.uid() = user_id
        AND (
            -- Bypass for admins/staff
            public.has_role(auth.uid(), 'admin')
            OR public.has_role(auth.uid(), 'data_entry')
            -- Or match still hasn't started
            OR EXISTS (
                SELECT 1 FROM public.partidos p
                WHERE p.id = match_id
                AND p.fecha > now()
            )
        )
    );

COMMENT ON POLICY "Users can insert own predictions before match starts" ON public.pronosticos IS
'RLS: users can only vote before the match starts, but admins/staff can bypass for testing or corrections.';
