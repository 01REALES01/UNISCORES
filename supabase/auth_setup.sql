-- =====================================================
-- SCRIPT DE AUTH - OLIMPIADAS UNINORTE
-- =====================================================
-- INSTRUCCIONES:
-- 1. Ve a tu Supabase Dashboard → SQL Editor
-- 2. Crea una nueva Query
-- 3. Copia y pega TODO este contenido
-- 4. Click "Run"
-- 5. ¡Listo! El primer usuario en iniciar sesión será admin
-- =====================================================

-- ============================================
-- PARTE 1: ASEGURAR TABLA PROFILES
-- ============================================

-- Crear tabla profiles si no existe
-- (Si ya la creaste con schema.sql, esto no hará nada)
CREATE TABLE IF NOT EXISTS profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email text,
    role text DEFAULT 'public',
    full_name text,
    avatar_url text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Agregar columnas que podrían faltar si la tabla ya existía
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE profiles ADD COLUMN updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'avatar_url') THEN
        ALTER TABLE profiles ADD COLUMN avatar_url text;
    END IF;
END $$;

-- ============================================
-- PARTE 2: TRIGGER AUTO-CREAR PROFILE
-- ============================================
-- Cuando alguien se registra en auth.users, 
-- automáticamente se crea un perfil en profiles

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        'public',
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- PARTE 3: POLÍTICAS RLS
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas anteriores (por si acaso)
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profile" ON profiles;

-- Todos pueden ver perfiles
CREATE POLICY "Public profiles are viewable by everyone" 
    ON profiles FOR SELECT USING (true);

-- Usuarios pueden actualizar su propio perfil
CREATE POLICY "Users can update own profile" 
    ON profiles FOR UPDATE 
    USING (auth.uid() = id);

-- Permitir insertar perfiles (necesario para crear el primer admin)
CREATE POLICY "Anyone can insert profile" 
    ON profiles FOR INSERT 
    WITH CHECK (true);

-- ============================================
-- PARTE 4: SINCRONIZAR USUARIOS EXISTENTES
-- ============================================
-- Si ya tienes usuarios en auth.users pero no en profiles,
-- esto les crea un perfil

INSERT INTO public.profiles (id, email, full_name, role, created_at, updated_at)
SELECT 
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', u.email),
    'public',
    u.created_at,
    NOW()
FROM auth.users u
WHERE NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
)
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Muestra todos los perfiles creados
SELECT id, email, role, full_name, created_at FROM profiles ORDER BY created_at;
