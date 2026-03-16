-- =====================================================
-- REPARAR SINCRONIZACIÓN DE PERFILES
-- =====================================================
-- Este script fuerza la sincronización de nombres y fotos
-- y asegura que el sistema automático esté activo.
-- =====================================================

-- 1. Sincronizar todos los datos actuales (profiles -> public_profiles)
UPDATE public.public_profiles pp
SET 
  display_name = p.full_name,
  avatar_url = p.avatar_url,
  email = p.email
FROM public.profiles p
WHERE pp.id = p.id;

-- 2. Asegurar que los perfiles públicos sean actualizables por el usuario
-- (Esto permite que el Frontend también pueda sincronizar como respaldo)
DROP POLICY IF EXISTS "Users can update their own public profile" ON public.public_profiles;
CREATE POLICY "Users can update their own public profile" ON public.public_profiles
    FOR UPDATE USING (auth.uid() = id);

-- 3. Re-instalar el TRIGGER automático (Cinturón y Tirantes)
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

-- 4. Verificar resultados (Ver los primeros 5)
SELECT p.id, p.full_name, pp.display_name 
FROM profiles p 
JOIN public_profiles pp ON p.id = pp.id 
LIMIT 5;
