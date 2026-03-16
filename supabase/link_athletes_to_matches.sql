-- Migración: Vincular Deportistas a Partidos
-- Descripción: Añade columnas para referenciar perfiles de atletas en la tabla partidos.

-- 1. Añadir columnas de referencia a profiles
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS athlete_a_id UUID REFERENCES public.profiles(id);
ALTER TABLE public.partidos ADD COLUMN IF NOT EXISTS athlete_b_id UUID REFERENCES public.profiles(id);

-- 2. Intento de auto-vinculación (Opcional/Heurístico)
-- Vincula deportistas existentes si el nombre coincide exactamente con equipo_a/b en deportes individuales.
DO $$
BEGIN
    -- Solo para deportes individuales (Ajedrez, Tenis, etc.)
    -- Nota: Esto es un "best-effort". Los admin deberán corregir/completar esto manualmente.
    UPDATE public.partidos p
    SET athlete_a_id = pr.id
    FROM public.profiles pr
    JOIN public.disciplinas d ON pr.athlete_disciplina_id = d.id
    WHERE p.equipo_a = pr.full_name
    AND pr.role = 'deportista';

    UPDATE public.partidos p
    SET athlete_b_id = pr.id
    FROM public.profiles pr
    JOIN public.disciplinas d ON pr.athlete_disciplina_id = d.id
    WHERE p.equipo_b = pr.full_name
    AND pr.role = 'deportista';

    RAISE NOTICE 'Auto-vinculación inicial completada.';
END $$;

-- 3. Crear índices para optimizar los joins
CREATE INDEX IF NOT EXISTS idx_partidos_athlete_a ON public.partidos(athlete_a_id);
CREATE INDEX IF NOT EXISTS idx_partidos_athlete_b ON public.partidos(athlete_b_id);
