-- Migration: Advanced Profile System & Table Unification
-- Description: Adds 'deportista' role, unifies public_profiles into profiles, and adds athlete fields.

BEGIN;

-- 1. Update user_role enum to include 'deportista'
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'deportista') THEN
        ALTER TYPE user_role ADD VALUE 'deportista';
    END IF;
END $$;

-- 2. Add new columns to profiles table
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS avatar_url TEXT,
    ADD COLUMN IF NOT EXISTS bio TEXT,
    ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
    ADD COLUMN IF NOT EXISTS athlete_disciplina_id BIGINT REFERENCES public.disciplinas(id),
    ADD COLUMN IF NOT EXISTS athlete_stats JSONB DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS carrera_id BIGINT REFERENCES public.carreras(id);

-- 3. Sync data from public_profiles to profiles (Unification)
-- This ensures points and display_names from the Quiniela are preserved
UPDATE public.profiles p
SET 
    points = pp.points,
    full_name = COALESCE(p.full_name, pp.display_name),
    avatar_url = COALESCE(p.avatar_url, pp.avatar_url)
FROM public.public_profiles pp
WHERE p.id = pp.id;

-- 4. Create a View for backward compatibility
-- This allows existing 'quiniela' code to keep querying 'public_profiles'
-- Note: We first rename the existing table to avoid conflict if we want to use the same name for the view,
-- but for now, we'll just prepare the SQL for the user to run in the dashboard.

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

COMMIT;
