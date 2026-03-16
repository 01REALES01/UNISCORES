-- =====================================================
-- SCRIPT DE MIGRACIÓN ROLES (FIXED) - OLIMPIADAS UNINORTE
-- =====================================================
-- Este script soluciona el error de dependencia (2BP01)
-- al migrar la columna 'role' a 'roles[]'.
-- =====================================================

-- 1. CREAR FUNCIONES AUXILIARES (Para simplificar RLS)
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_to_check text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role_to_check = ANY(roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_admin(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN public.has_role(uid, 'admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ASEGURAR COLUMNA ROLES Y MIGRAR DATOS
DO $$
BEGIN
    -- Añadir columna roles si no existe
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'roles') THEN
        ALTER TABLE profiles ADD COLUMN roles text[] DEFAULT ARRAY['public'];
    END IF;

    -- Migrar datos de 'role' a 'roles' si 'role' existe
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        UPDATE profiles SET roles = ARRAY[role::text] WHERE roles = ARRAY['public'] OR roles IS NULL;
    END IF;
END $$;

-- 3. ELIMINAR COLUMNA VIEJA CON CASCADE
-- ADVERTENCIA: Esto borrará las políticas dependientes. Las recrearemos a continuación.
ALTER TABLE profiles DROP COLUMN IF EXISTS role CASCADE;

-- 4. RECREAR POLÍTICAS DEPENDIENTES (Usando roles[])

-- --- TABLA: profiles ---
DROP POLICY IF EXISTS "Admins can update all profiles" ON profiles;
CREATE POLICY "Admins can update all profiles"
    ON profiles FOR UPDATE
    USING (public.is_admin(auth.uid()));

-- --- TABLA: noticias ---
DROP POLICY IF EXISTS "Admin full access" ON noticias;
CREATE POLICY "Admin full access" ON noticias FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and Data Entry can modify noticias" ON noticias;
CREATE POLICY "Admins and Data Entry can modify noticias" ON noticias FOR ALL
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry'));

DROP POLICY IF EXISTS "Permitir insert a staff" ON noticias;
CREATE POLICY "Permitir insert a staff" ON noticias FOR INSERT
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry') OR public.has_role(auth.uid(), 'periodista'));

DROP POLICY IF EXISTS "Permitir update a staff" ON noticias;
CREATE POLICY "Permitir update a staff" ON noticias FOR UPDATE
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry') OR public.has_role(auth.uid(), 'periodista'));

DROP POLICY IF EXISTS "Permitir delete a staff" ON noticias;
CREATE POLICY "Permitir delete a staff" ON noticias FOR DELETE
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry') OR public.has_role(auth.uid(), 'periodista'));

-- --- TABLA: partidos ---
DROP POLICY IF EXISTS "Admins and Data Entry can insert partidos" ON partidos;
CREATE POLICY "Admins and Data Entry can insert partidos" ON partidos FOR INSERT 
    WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry'));

DROP POLICY IF EXISTS "Admins and Data Entry can update partidos" ON partidos;
CREATE POLICY "Admins and Data Entry can update partidos" ON partidos FOR UPDATE 
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry'));

DROP POLICY IF EXISTS "Admins and Data Entry can delete partidos" ON partidos;
CREATE POLICY "Admins and Data Entry can delete partidos" ON partidos FOR DELETE 
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry'));

-- --- OTRAS TABLAS ---
DROP POLICY IF EXISTS "Admins can modify carreras" ON carreras;
CREATE POLICY "Admins can modify carreras" ON carreras FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can modify disciplinas" ON disciplinas;
CREATE POLICY "Admins can modify disciplinas" ON disciplinas FOR ALL USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins ven todas las favoritas" ON user_carreras_favoritas;
CREATE POLICY "Admins ven todas las favoritas" ON user_carreras_favoritas FOR SELECT USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins and Data Entry can modify olympics_eventos" ON olympics_eventos;
CREATE POLICY "Admins and Data Entry can modify olympics_eventos" ON olympics_eventos FOR ALL
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry'));

DROP POLICY IF EXISTS "Admins and Data Entry can modify olympics_jugadores" ON olympics_jugadores;
CREATE POLICY "Admins and Data Entry can modify olympics_jugadores" ON olympics_jugadores FOR ALL
    USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'data_entry'));

-- 5. ACTUALIZAR TRIGGER (Para que inserte en ambas tablas de perfil)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
    -- 1. Perfil principal
    INSERT INTO public.profiles (id, email, full_name, roles, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        ARRAY['public'],
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        updated_at = NOW();

    -- 2. Perfil público (para la Quiniela/Ranking)
    -- Verificamos si la tabla existe antes de insertar (por si acaso)
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'public_profiles') THEN
        INSERT INTO public.public_profiles (id, email, display_name, created_at)
        VALUES (
            NEW.id,
            NEW.email,
            COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
            NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
            display_name = COALESCE(public_profiles.display_name, EXCLUDED.display_name);
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sincronizar fallidos en ambas tablas
-- Sincronizar profiles
INSERT INTO public.profiles (id, email, full_name, roles, created_at, updated_at)
SELECT 
    u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email), ARRAY['public'], u.created_at, NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;

-- Sincronizar public_profiles (Quiniela)
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'public_profiles') THEN
        -- Asegurar RLS
        ALTER TABLE public.public_profiles ENABLE ROW LEVEL SECURITY;
        
        -- Política de lectura pública
        IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
            CREATE POLICY "Public profiles are viewable by everyone" ON public.public_profiles FOR SELECT USING (true);
        END IF;

        INSERT INTO public.public_profiles (id, email, display_name, created_at)
        SELECT 
            u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', u.email), u.created_at
        FROM auth.users u
        WHERE NOT EXISTS (SELECT 1 FROM public.public_profiles pp WHERE pp.id = u.id)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;

-- 6. TRIGGER DE SINCRONIZACIÓN DE PERFIL (AUTOMÁTICO)
-- Sincroniza cambios de nombre y avatar del perfil privado al público
CREATE OR REPLACE FUNCTION public.sync_public_profile_on_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.public_profiles
    SET 
        display_name = NEW.full_name,
        avatar_url = NEW.avatar_url,
        email = NEW.email
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_update_sync ON public.profiles;
CREATE TRIGGER on_profile_update_sync
    AFTER UPDATE OF full_name, avatar_url, email ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_public_profile_on_update();

-- VERIFICACIÓN FINAL
SELECT id, email, roles FROM profiles LIMIT 10;
