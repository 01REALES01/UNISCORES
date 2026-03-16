-- Migración: Soporte para múltiples carreras académicas (Doble Titulación)
-- Fecha: 2026-03-16

-- 1. Añadir columna carreras_ids (array de bigint) a la tabla profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS carreras_ids bigint[] DEFAULT ARRAY[]::bigint[];

-- 2. Migrar datos de la columna carrera_id existente al nuevo array
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'carrera_id') THEN
        UPDATE public.profiles 
        SET carreras_ids = ARRAY[carrera_id] 
        WHERE carrera_id IS NOT NULL AND (carreras_ids IS NULL OR cardinality(carreras_ids) = 0);
        
        RAISE NOTICE 'Datos de carrera_id migrados a carreras_ids.';
    END IF;
END $$;

-- 3. Sincronizar con public_profiles (Quiniela)
-- Añadimos la misma columna a public_profiles para que el Ranking pueda mostrar las carreras
ALTER TABLE public.public_profiles ADD COLUMN IF NOT EXISTS carreras_ids bigint[] DEFAULT ARRAY[]::bigint[];

-- 4. Actualizar trigger de sincronización
CREATE OR REPLACE FUNCTION public.sync_public_profile_on_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.public_profiles
    SET 
        display_name = NEW.full_name,
        avatar_url = NEW.avatar_url,
        email = NEW.email,
        carreras_ids = NEW.carreras_ids  -- Sincronizar las carreras
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Sincronización inicial para perfiles existentes
UPDATE public.public_profiles pp
SET carreras_ids = p.carreras_ids
FROM public.profiles p
WHERE pp.id = p.id;

RAISE NOTICE 'Migración de múltiples carreras completada.';
