-- =====================================================
-- PERFORMANCE BOOSTER: RLS & ROLE CONSOLIDATION
-- =====================================================
-- Este script optimiza las políticas de seguridad para eliminar 
-- los bloqueos de 1 minuto y unifica el sistema de roles.
-- =====================================================

-- 1. UNIFICACIÓN DE ROLES (Trigger de Sincronización)
-- Asegura que 'role' y 'roles[]' estén siempre sincronizados
CREATE OR REPLACE FUNCTION public.sync_user_roles()
RETURNS TRIGGER AS $$
BEGIN
    -- Si es un INSERT o si los roles han cambiado en un UPDATE
    IF (TG_OP = 'INSERT') OR (NEW.roles IS DISTINCT FROM OLD.roles) THEN
        IF 'admin' = ANY(NEW.roles) THEN NEW.role := 'admin';
        ELSIF 'data_entry' = ANY(NEW.roles) THEN NEW.role := 'data_entry';
        ELSIF 'periodista' = ANY(NEW.roles) THEN NEW.role := 'periodista';
        ELSE NEW.role := 'public';
        END IF;
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- En caso de error (ej: OLD no definido en INSERT en algunas versiones)
    IF (TG_OP = 'INSERT') THEN
        IF 'admin' = ANY(NEW.roles) THEN NEW.role := 'admin';
        ELSIF 'data_entry' = ANY(NEW.roles) THEN NEW.role := 'data_entry';
        ELSIF 'periodista' = ANY(NEW.roles) THEN NEW.role := 'periodista';
        ELSE NEW.role := 'public';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_user_roles ON public.profiles;
CREATE TRIGGER trigger_sync_user_roles
    BEFORE INSERT OR UPDATE OF roles ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.sync_user_roles();

-- 2. FUNCIONES DE PERMISOS OPTIMIZADAS (Memoizadas por sesión)
-- Estas funciones evitan subconsultas repetidas en RLS
CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[] AS $$
DECLARE
  val text[];
BEGIN
  -- Intentar obtener de la variable de sesión
  val := current_setting('app.current_user_roles', true)::text[];
  IF val IS NULL THEN
    -- Si no existe en la sesión, buscar en la tabla y guardar
    SELECT roles::text[] INTO val FROM public.profiles WHERE id = auth.uid();
    PERFORM set_config('app.current_user_roles', val::text, true);
  END IF;
  RETURN val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Helpers rápidos
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT 'admin' = ANY(public.get_my_roles());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_data_entry() RETURNS boolean AS $$
  SELECT 'data_entry' = ANY(public.get_my_roles());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_fast() RETURNS boolean AS $$
  SELECT public.get_my_roles() && ARRAY['admin', 'data_entry', 'periodista']::text[];
$$ LANGUAGE sql SECURITY DEFINER;

-- 3. REEMPLAZO MASIVO DE POLÍTICAS (TRÁFICO PESADO)

-- 3.1 PARTIDOS
DROP POLICY IF EXISTS "Staff can update partidos optimized" ON public.partidos;
CREATE POLICY "Staff can update partidos optimized" ON public.partidos 
    FOR UPDATE USING ( public.is_staff_fast() );

-- 3.2 EVENTOS (Muy pesado)
DROP POLICY IF EXISTS "Staff can modify eventos optimized" ON public.olympics_eventos;
CREATE POLICY "Staff can modify eventos optimized" ON public.olympics_eventos 
    FOR ALL USING ( public.is_staff_fast() );

-- 3.3 JUGADORES
DROP POLICY IF EXISTS "Staff can modify jugadores optimized" ON public.olympics_jugadores;
CREATE POLICY "Staff can modify jugadores optimized" ON public.olympics_jugadores 
    FOR ALL USING ( public.is_staff_fast() );

-- 3.4 NOTICIAS
DROP POLICY IF EXISTS "Staff can modify noticias optimized" ON public.noticias;
CREATE POLICY "Staff can modify noticias optimized" ON public.noticias 
    FOR ALL USING ( (public.get_my_roles() && ARRAY['admin', 'periodista', 'data_entry']::text[]) );

-- 4. LIMPIEZA DE CACHÉ DE ESQUEMA (Solo si se corre en SQL Editor)
-- NOTIFY pgrst, 'reload schema';
