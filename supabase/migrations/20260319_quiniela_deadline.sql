-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Quiniela Deadline Constraint
-- Date: 2026-03-19
-- Description: Prevents predictions (pronosticos) from being inserted/updated after
--              the associated match has started. Uses RLS policies only.
--              NOTE: CHECK constraints referencing other tables are not valid in
--              PostgreSQL — RLS policies are sufficient and the correct approach.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Ensure RLS is enabled
ALTER TABLE public.pronosticos ENABLE ROW LEVEL SECURITY;

-- 2. Drop existing policies
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.pronosticos;
DROP POLICY IF EXISTS "Users can update own predictions" ON public.pronosticos;
DROP POLICY IF EXISTS "Predictions are viewable by everyone" ON public.pronosticos;
DROP POLICY IF EXISTS "Users can insert own predictions before match starts" ON public.pronosticos;
DROP POLICY IF EXISTS "Users can update own predictions before match starts" ON public.pronosticos;
DROP POLICY IF EXISTS "Pronosticos cannot be deleted" ON public.pronosticos;

-- 3. SELECT: everyone can view predictions
CREATE POLICY "Predictions are viewable by everyone"
    ON public.pronosticos FOR SELECT
    USING (true);

-- 4. INSERT: user must own prediction + match fecha must be in the future
CREATE POLICY "Users can insert own predictions before match starts"
    ON public.pronosticos FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.partidos p
            WHERE p.id = match_id
            AND p.fecha > now()
        )
    );

-- 5. UPDATE: same restriction
CREATE POLICY "Users can update own predictions before match starts"
    ON public.pronosticos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM public.partidos p
            WHERE p.id = match_id
            AND p.fecha > now()
        )
    );

-- 6. DELETE: not allowed (predictions are permanent)
CREATE POLICY "Pronosticos cannot be deleted"
    ON public.pronosticos FOR DELETE
    USING (false);

-- 7. Index optimization
CREATE INDEX IF NOT EXISTS idx_partidos_fecha
    ON public.partidos(fecha);

CREATE INDEX IF NOT EXISTS idx_pronosticos_pending
    ON public.pronosticos(match_id)
    WHERE puntos_ganados IS NULL;
