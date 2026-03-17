-- =====================================================
-- GIGA FIX: REGISTRO Y ESQUEMA DE PERFILES (FINAL)
-- =====================================================
-- Ejecuta este script completo en el SQL Editor de Supabase.
-- Corrige:
-- 1. Columnas faltantes (roles, is_public, points, etc.)
-- 2. Error de trigger sync_user_roles (quita 'role' legacy)
-- 3. Error de registro de nuevos usuarios (handle_new_user robusto)
-- =====================================================

BEGIN;

-- 1. ASEGURAR COLUMNAS EN LA TABLA PROFILES
ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS roles text[] DEFAULT ARRAY['public'],
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS points integer DEFAULT 0,
    ADD COLUMN IF NOT EXISTS created_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT now(),
    ADD COLUMN IF NOT EXISTS tagline varchar(100),
    ADD COLUMN IF NOT EXISTS about_me text;

-- 2. ASEGURAR COLUMNAS EN LA TABLA PUBLIC_PROFILES (Quiniela)
CREATE TABLE IF NOT EXISTS public.public_profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    display_name text,
    avatar_url text,
    points integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    tagline varchar(100),
    about_me text
);

-- 3. FUNCIÓN DE SINCRONIZACIÓN DE ROLES (CORREGIDA)
-- Eliminamos la referencia a NEW.role (legacy) para evitar el crash
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Solo sincronizamos si es un INSERT o si los roles han cambiado
    -- NOTA: Si necesitas la columna 'role' (singular) por compatibilidad, 
    -- asegúrate de que exista antes de descomentar la línea de asignación.
    
    -- Para este sistema, usamos 'roles' (array) como fuente de verdad.
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. FUNCIÓN HANDLE_NEW_USER (ULTRA-ROBUSTA)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
    _display_name text;
BEGIN
    -- Extraer nombre de metadatos de Google/Microsoft/Email
    _display_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'preferred_username',
        split_part(COALESCE(NEW.email, 'usuario@'), '@', 1)
    );

    -- A. INSERTAR EN PROFILES (Admin/Principal)
    INSERT INTO public.profiles (
        id, email, full_name, roles, is_public, points, created_at, updated_at
    )
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

    -- B. INSERTAR EN PUBLIC_PROFILES (Quiniela/Gamificación)
    INSERT INTO public.public_profiles (
        id, email, display_name, created_at
    )
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
EXCEPTION WHEN OTHERS THEN
    -- Ante cualquier error, dejamos que el usuario se cree en Auth
    -- para no bloquear el acceso, aunque el perfil falle (mejor que error 500)
    RETURN NEW;
END;
$$;

-- 5. RECREAR TRIGGERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.profiles;
CREATE TRIGGER trigger_sync_user_roles
    BEFORE INSERT OR UPDATE OF roles ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles();

-- 6. SINCRONIZAR USUARIOS HUÉRFANOS (Si quedó alguno a medias)
INSERT INTO public.profiles (id, email, full_name, roles, created_at, updated_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email), ARRAY['public'], u.created_at, NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.public_profiles (id, email, display_name, created_at)
SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.created_at
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = u.id)
ON CONFLICT (id) DO NOTHING;

COMMIT;
