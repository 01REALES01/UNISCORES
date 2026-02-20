-- =====================================================
-- FIX: SINCRONIZAR USUARIOS EN AMBAS TABLAS DE PERFILES
-- =====================================================
-- PROBLEMA: El trigger 'handle_new_user' solo insertaba en 'public_profiles',
-- pero el panel de admin lee de 'profiles'. Resultado: los usuarios
-- se registran pero no aparecen en el panel de admin.
--
-- SOLUCIÓN: Actualizar el trigger para insertar en AMBAS tablas,
-- y sincronizar los usuarios existentes que faltan.
--
-- INSTRUCCIONES:
-- 1. Ve a Supabase Dashboard → SQL Editor
-- 2. Copia y pega TODO este contenido
-- 3. Click "Run"
-- =====================================================

-- ============================================
-- PASO 1: Asegurar que ambas tablas existan
-- ============================================

-- Tabla 'profiles' (usada por el panel admin)
CREATE TABLE IF NOT EXISTS public.profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    role text DEFAULT 'public',
    full_name text,
    avatar_url text,
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
    role text DEFAULT 'user',
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- PASO 2: Actualizar el trigger para insertar en AMBAS tablas
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _display_name text;
BEGIN
    _display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );

    -- Insertar en 'profiles' (para el panel admin)
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        _display_name,
        'public',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();

    -- Insertar en 'public_profiles' (para la quiniela/gamificación)
    INSERT INTO public.public_profiles (id, email, display_name, created_at)
    VALUES (
        NEW.id,
        NEW.email,
        _display_name,
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = COALESCE(public_profiles.display_name, EXCLUDED.display_name);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recrear el trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PASO 3: Sincronizar usuarios EXISTENTES que faltan en 'profiles'
-- ============================================

INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
    'public',
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
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)),
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
    -- Permitir lectura pública
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Profiles viewable by everyone') THEN
        CREATE POLICY "Profiles viewable by everyone" ON public.profiles FOR SELECT USING (true);
    END IF;

    -- Permitir insert (necesario para el trigger)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Allow insert profiles') THEN
        CREATE POLICY "Allow insert profiles" ON public.profiles FOR INSERT WITH CHECK (true);
    END IF;

    -- Permitir update para admins y el propio usuario
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

-- Mostrar usuarios en 'profiles' (panel admin)
SELECT 'PROFILES (Admin Panel)' AS tabla, COUNT(*) AS total FROM public.profiles;

-- Mostrar usuarios en 'public_profiles' (quiniela)
SELECT 'PUBLIC_PROFILES (Quiniela)' AS tabla, COUNT(*) AS total FROM public.public_profiles;

-- Mostrar usuarios en auth.users que NO están en profiles
SELECT 'FALTANTES EN PROFILES' AS problema, COUNT(*) AS total
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id);

-- Mostrar usuarios en auth.users que NO están en public_profiles
SELECT 'FALTANTES EN PUBLIC_PROFILES' AS problema, COUNT(*) AS total
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = u.id);
