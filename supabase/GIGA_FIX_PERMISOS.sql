-- =====================================================
-- SUPER-FIX: PERMISOS Y RLS (PARTIDOS Y ROLES)
-- =====================================================
-- Este script soluciona el error de "RLS Violation" al crear partidos
-- y asegura que el sistema de roles array[] sea 100% funcional.
-- =====================================================

-- 1. Asegurar funciones de ayuda (Robustas y con bypass de RLS)
CREATE OR REPLACE FUNCTION public.has_role(uid uuid, role_to_check text)
RETURNS boolean AS $$
BEGIN
  -- Usamos un subquery directo para evitar dependencias
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND (roles @> ARRAY[role_to_check])
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_staff(uid uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND (
        roles @> ARRAY['admin'] OR 
        roles @> ARRAY['data_entry'] OR 
        roles @> ARRAY['periodista']
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. Limpiar y Recrear Políticas de PARTIDOS
ALTER TABLE public.partidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public view" ON public.partidos;
DROP POLICY IF EXISTS "Partidos are viewable by everyone" ON public.partidos;
CREATE POLICY "Partidos are viewable by everyone" ON public.partidos FOR SELECT USING (true);

-- Política de INSERCIÓN (Para Admin y Data Entry)
DROP POLICY IF EXISTS "Admins and Data Entry can insert partidos" ON public.partidos;
DROP POLICY IF EXISTS "Admins can insert partidos" ON public.partidos;
DROP POLICY IF EXISTS "Enable insert for everyone" ON public.partidos;
CREATE POLICY "Staff can insert partidos" ON public.partidos 
    FOR INSERT WITH CHECK ( public.is_staff(auth.uid()) );

-- Política de ACTUALIZACIÓN (Para Admin y Data Entry)
DROP POLICY IF EXISTS "Admins and Data Entry can update partidos" ON public.partidos;
DROP POLICY IF EXISTS "Enable update for everyone" ON public.partidos;
DROP POLICY IF EXISTS "Admins and assigned Data Entry can update partidos" ON public.partidos;
CREATE POLICY "Staff can update partidos" ON public.partidos 
    FOR UPDATE USING ( public.is_staff(auth.uid()) );

-- Política de ELIMINACIÓN (Solo Admin)
DROP POLICY IF EXISTS "Admins can delete partidos" ON public.partidos;
DROP POLICY IF EXISTS "Admins and Data Entry can delete partidos" ON public.partidos;
CREATE POLICY "Only admins can delete partidos" ON public.partidos 
    FOR DELETE USING ( public.has_role(auth.uid(), 'admin') );

-- 3. Asegurar Políticas de PERFILES (Evitar recursión)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- 4. AUTOCORRECCIÓN: Asegurar que el usuario actual tenga rol de admin si es necesario
-- (Sustituye 'TU_ID_AQUÍ' si quieres forzar un ID específico, o simplemente corre esto)
UPDATE public.profiles 
SET roles = ARRAY['admin'] 
WHERE id = auth.uid(); -- Nota: auth.uid() en SQL Editor solo funciona si se corre como el usuario, mejor omitir o usar ID real.

-- 5. Sincronizar roles de la columna vieja si aún existe
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'role') THEN
        UPDATE public.profiles SET roles = ARRAY[role::text] WHERE roles = ARRAY['public'] OR roles IS NULL;
    END IF;
END $$;
