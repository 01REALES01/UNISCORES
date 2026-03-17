-- =====================================================
-- FIX: SINCRONIZAR USUARIOS EN AMBAS TABLAS DE PERFILES
-- =====================================================
-- NOTA: Este archivo fue actualizado para usar 'roles[]' en vez
-- de la columna 'role' (singular) que ya no existe en el esquema actual.
-- =====================================================

-- ============================================
-- PASO 1: Asegurar que ambas tablas existan
-- ============================================

-- Tabla 'profiles' (usada por el panel admin)
-- NOTA: solo crea si no existe; no altera columnas existentes
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    roles text[] DEFAULT ARRAY['public'],
    full_name text,
    avatar_url text,
    is_public boolean DEFAULT true,
    points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla 'public_profiles' (usada por la quiniela/gamificación)
CREATE TABLE IF NOT EXISTS public.public_profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    display_name text,
    avatar_url text,
    points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- PASO 2: Trigger handle_new_user corregido
--          usa 'roles[]' (esquema actual)
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _display_name text;
BEGIN
    _display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'preferred_username',
        split_part(COALESCE(NEW.email, 'usuario@'), '@', 1)
    );

    -- Insertar en 'profiles' (para el panel admin)
    INSERT INTO public.profiles (id, email, full_name, roles, is_public, points, created_at, updated_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        _display_name,
        ARRAY['public']::text[],
        true,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        updated_at = NOW();

    -- Insertar en 'public_profiles' (para la quiniela/gamificación)
    INSERT INTO public.public_profiles (id, email, display_name, created_at)
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        _display_name,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email        = EXCLUDED.email,
        display_name = COALESCE(public_profiles.display_name, EXCLUDED.display_name);

    RETURN NEW;
END;
$$;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 3: Sincronizar usuarios EXISTENTES que faltan en 'profiles'
-- ============================================

INSERT INTO public.profiles (id, email, full_name, roles, is_public, points, created_at, updated_at)
SELECT
    u.id,
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, 'usuario@'), '@', 1)),
    ARRAY['public']::text[],
    true,
    0,
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 4: Sincronizar usuarios EXISTENTES que faltan en 'public_profiles'
-- ============================================

INSERT INTO public.public_profiles (id, email, display_name, created_at)
SELECT
    u.id,
    COALESCE(u.email, ''),
    COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, 'usuario@'), '@', 1)),
    u.created_at
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.public_profiles pp WHERE pp.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- PASO 5: Asegurar políticas RLS en ambas tablas
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;

-- Políticas para 'profiles'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Profiles viewable by everyone') THEN
        CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow insert profiles') THEN
        CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow update profiles') THEN
        CREATE POLICY "Allow update profiles" ON public.profiles FOR UPDATE USING (true);
    END IF;
END $$;

-- Políticas para 'public_profiles'
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Public profiles viewable by everyone') THEN
        CREATE POLICY "Public profiles viewable by everyone" ON public.public_profiles FOR SELECT USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Allow insert public_profiles') THEN
        CREATE POLICY "Allow insert public_profiles" ON public.public_profiles FOR INSERT WITH CHECK (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Allow update public_profiles') THEN
        CREATE POLICY "Allow update public_profiles" ON public.public_profiles FOR UPDATE USING (true);
    END IF;
END $$;

-- ============================================
-- VERIFICACIÓN FINAL
-- ============================================

SELECT 'PROFILES (Admin Panel)' AS tabla, COUNT(*) AS total FROM public.profiles;
SELECT 'PUBLIC_PROFILES (Quiniela)' AS tabla, COUNT(*) AS total FROM public.public_profiles;

SELECT 'FALTANTES EN PROFILES' AS problema, COUNT(*) AS total
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

SELECT 'FALTANTES EN PUBLIC_PROFILES' AS problema, COUNT(*) AS total
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = u.id);
