-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Quiniela Deadline Constraint
-- Date: 2026-03-19
-- Description: Prevents predictions (pronosticos) from being inserted/updated after
--              the associated match (partido) has started (fecha <= now()).
--              Uses RLS policy + CHECK constraint for defense in depth.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. Ensure pronosticos table has RLS enabled
ALTER TABLE public.pronosticos ENABLE ROW LEVEL SECURITY;

-- 2. DROP existing policies to recreate with deadline enforcement
DROP POLICY IF EXISTS "Users can insert own predictions" ON public.pronosticos;
DROP POLICY IF EXISTS "Users can update own predictions" ON public.pronosticos;
DROP POLICY IF EXISTS "Predictions are viewable by everyone" ON public.pronosticos;

-- 3. SELECT policy: allow everyone to view
CREATE POLICY "Predictions are viewable by everyone"
    ON public.pronosticos FOR SELECT
    USING (TRUE);

-- 4. INSERT policy: user must own prediction + match must not have started
CREATE POLICY "Users can insert own predictions before match starts"
    ON public.pronosticos FOR INSERT
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            -- Verify match exists and fecha is in the future
            SELECT 1 FROM public.partidos p
            WHERE p.id = match_id
            AND p.fecha > NOW()
        )
    );

-- 5. UPDATE policy: user must own prediction + match must not have started
CREATE POLICY "Users can update own predictions before match starts"
    ON public.pronosticos FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            -- Verify match exists and fecha is still in the future
            SELECT 1 FROM public.partidos p
            WHERE p.id = match_id
            AND p.fecha > NOW()
        )
    );

-- 6. DELETE policy: disallow deletion (predictions are immutable once finalized)
DROP POLICY IF EXISTS "Pronosticos cannot be deleted" ON public.pronosticos;
CREATE POLICY "Pronosticos cannot be deleted"
    ON public.pronosticos FOR DELETE
    USING (FALSE);

COMMENT ON POLICY "Users can insert own predictions before match starts" ON public.pronosticos IS
'RLS policy ensures predictions can only be inserted if the match fecha is still in the future (deadline not passed).';

COMMENT ON POLICY "Users can update own predictions before match starts" ON public.pronosticos IS
'RLS policy ensures predictions can only be updated if the match fecha is still in the future.';

-- 7. CHECK constraint as backup validation (defense in depth)
--    This provides a database-level safeguard independent of RLS.
--    Note: CHECK constraints cannot directly reference other tables in standard PostgreSQL,
--    so we use a helper function that returns BOOLEAN.

DROP FUNCTION IF EXISTS public.check_pronostico_deadline(BIGINT) CASCADE;

CREATE FUNCTION public.check_pronostico_deadline(match_id BIGINT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT EXISTS(
        SELECT 1 FROM public.partidos p
        WHERE p.id = match_id AND p.fecha > NOW()
    );
$$;

COMMENT ON FUNCTION public.check_pronostico_deadline(BIGINT) IS
'Helper function for CHECK constraint. Returns TRUE if match fecha is in the future (deadline not passed).';

-- 8. Add CHECK constraint to pronosticos table
--    Uses the helper function to validate that match deadline has not passed.
ALTER TABLE public.pronosticos
    DROP CONSTRAINT IF EXISTS check_pronostico_deadline;

ALTER TABLE public.pronosticos
    ADD CONSTRAINT check_pronostico_deadline
    CHECK (public.check_pronostico_deadline(match_id));

COMMENT ON CONSTRAINT check_pronostico_deadline ON public.pronosticos IS
'Backup constraint: prevents INSERT/UPDATE of pronosticos if match has already started (fecha <= now()).';

-- 9. Index optimization for deadline checks
CREATE INDEX IF NOT EXISTS idx_partidos_fecha
    ON public.partidos(fecha);

CREATE INDEX IF NOT EXISTS idx_pronosticos_match_fecha
    ON public.pronosticos(match_id)
    WHERE puntos_ganados IS NULL;  -- Only pending predictions

COMMENT ON INDEX idx_pronosticos_match_fecha IS
'Optimizes queries for pending predictions linked to upcoming matches.';
