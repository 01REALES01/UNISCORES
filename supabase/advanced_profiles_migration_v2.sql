-- Migración: Sistema de Perfiles Avanzado (Versión Optimizada)
-- Descripción: Agrega el rol 'deportista', unifica datos y añade campos de atleta.
-- NOTA: Se eliminan BEGIN/COMMIT para evitar bloqueos si la conexión es inestable. Cada comando es independiente.

-- 1. Actualizar el enum user_role para incluir 'deportista'
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'user_role' AND e.enumlabel = 'deportista') THEN
        ALTER TYPE user_role ADD VALUE 'deportista';
    END IF;
END $$;

-- 2. Añadir nuevas columnas a la tabla profiles (Individualmente para evitar fallos globales)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS athlete_disciplina_id BIGINT REFERENCES public.disciplinas(id);
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS athlete_stats JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_public BOOLEAN DEFAULT TRUE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS carrera_id BIGINT REFERENCES public.carreras(id);

-- 3. Sincronizar datos de public_profiles a profiles (Unificación)
-- Solo se ejecuta si la tabla origen existe.
DO $$
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'public_profiles') THEN
        UPDATE public.profiles p
        SET 
            points = pp.points,
            full_name = COALESCE(p.full_name, pp.display_name),
            avatar_url = COALESCE(p.avatar_url, pp.avatar_url)
        FROM public.public_profiles pp
        WHERE p.id = pp.id;
        
        RAISE NOTICE 'Datos sincronizados exitosamente.';
    ELSE
        RAISE NOTICE 'La tabla public_profiles no existe, omitiendo sincronización.';
    END IF;
END $$;

-- 4. Asegurar Políticas RLS
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

RAISE NOTICE 'Migración completada.';
