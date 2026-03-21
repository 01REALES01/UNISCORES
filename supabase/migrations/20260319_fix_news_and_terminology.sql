-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Fix News RLS & En Vivo Terminology
-- Date: 2026-03-19
-- Description: Stabilize get_my_roles() and rename 'en_vivo' to 'en_curso'.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. STABILIZE get_my_roles()
-- This prevents the "malformed array literal" error for anonymous users who do not
-- have an existing session array.
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[] AS $$
DECLARE
  val_str text;
  val text[];
BEGIN
  val_str := current_setting('app.current_user_roles', true);
  
  -- If empty, null, or literally the string 'null', we must query the DB or default.
  IF val_str IS NULL OR val_str = '' OR val_str = 'null' THEN
    IF auth.uid() IS NOT NULL THEN
        SELECT roles::text[] INTO val FROM public.profiles WHERE id = auth.uid();
    END IF;
    
    IF val IS NULL THEN
        val := ARRAY['public']::text[];
    END IF;
    
    PERFORM set_config('app.current_user_roles', val::text, true);
  ELSE
    val := val_str::text[];
  END IF;
  
  RETURN val;
EXCEPTION WHEN OTHERS THEN
  -- Absolute safety net to prevent 500 errors in Select Queries
  RETURN ARRAY['public']::text[];
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;


-- 2. TERMINOLOGY FLIP: 'en_vivo' -> 'en_curso'
DO $$ 
DECLARE
    constraint_name text;
BEGIN
    -- 2A. Update the CHECK constraint if it enforces 'en_vivo'
    SELECT conname INTO constraint_name
    FROM pg_constraint
    WHERE conrelid = 'public.partidos'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) LIKE '%en_vivo%';

    IF constraint_name IS NOT NULL THEN
        EXECUTE 'ALTER TABLE public.partidos DROP CONSTRAINT ' || quote_ident(constraint_name);
        EXECUTE 'ALTER TABLE public.partidos ADD CONSTRAINT partidos_estado_check CHECK (estado IN (''programado'', ''en_curso'', ''finalizado'', ''cancelado''))';
    END IF;

    -- 2B. Update actual row data
    UPDATE public.partidos SET estado = 'en_curso' WHERE estado = 'en_vivo';
    
END $$;
