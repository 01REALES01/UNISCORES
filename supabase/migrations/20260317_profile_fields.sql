-- Migración: Nuevos campos de perfil (Frase y Sobre Mí)
-- Fecha: 2026-03-17

-- 1. Añadir columnas a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tagline varchar(100);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS about_me text;

-- 2. Añadir columnas a la tabla public_profiles
ALTER TABLE public.public_profiles ADD COLUMN IF NOT EXISTS tagline varchar(100);
ALTER TABLE public.public_profiles ADD COLUMN IF NOT EXISTS about_me text;

-- 3. Actualizar el trigger de sincronización para incluir los nuevos campos
CREATE OR REPLACE FUNCTION public.sync_public_profile_on_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.public_profiles
    SET 
        display_name = NEW.full_name,
        avatar_url = NEW.avatar_url,
        email = NEW.email,
        carreras_ids = NEW.carreras_ids,
        tagline = NEW.tagline,
        about_me = NEW.about_me
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sincronización inicial
UPDATE public.public_profiles pp
SET 
    tagline = p.tagline,
    about_me = p.about_me
FROM public.profiles p
WHERE pp.id = p.id;
