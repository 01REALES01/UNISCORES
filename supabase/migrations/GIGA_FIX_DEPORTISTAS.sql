-- ─────────────────────────────────────────────────────────────────────────────
-- GIGA FIX: VINCULACIÓN DE DEPORTISTAS Y ROLES (VERSION FINAL)
-- Ejecuta esto en el SQL Editor de Supabase para arreglar a todos los afectados.
-- ─────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1. ACTUALIZAR LA FUNCIÓN DEL TRIGGER (Versión Robusta para Multi-Deporte)
CREATE OR REPLACE FUNCTION public.auto_link_jugador_on_profile()
RETURNS TRIGGER AS $$
DECLARE
    _jugador_record RECORD;
    _linked         BOOLEAN := FALSE;
BEGIN
    -- A. Intentar por Email
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
        FOR _jugador_record IN 
            UPDATE public.jugadores
            SET profile_id = NEW.id,
                email = COALESCE(email, NEW.email)
            WHERE LOWER(email) = LOWER(NEW.email)
              AND (profile_id IS NULL OR profile_id = NEW.id)
            RETURNING id, carrera_id, disciplina_id
        LOOP
            _linked := TRUE;
            -- Sincronizar Carrera
            IF _jugador_record.carrera_id IS NOT NULL THEN
                UPDATE public.profiles
                SET carreras_ids = array_append(COALESCE(carreras_ids, ARRAY[]::bigint[]), _jugador_record.carrera_id)
                WHERE id = NEW.id AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[_jugador_record.carrera_id]);
            END IF;
            -- Sincronizar Disciplina
            IF _jugador_record.disciplina_id IS NOT NULL THEN
                INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
                VALUES (NEW.id, _jugador_record.disciplina_id)
                ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- B. Intentar por Nombre (si no se vinculó por email)
    IF NOT _linked AND NEW.full_name IS NOT NULL AND NEW.full_name <> '' THEN
        FOR _jugador_record IN 
            UPDATE public.jugadores
            SET profile_id = NEW.id,
                email = COALESCE(email, NEW.email)
            WHERE UPPER(TRIM(nombre)) = UPPER(TRIM(NEW.full_name))
              AND (profile_id IS NULL OR profile_id = NEW.id)
            RETURNING id, carrera_id, disciplina_id
        LOOP
            _linked := TRUE;
            IF _jugador_record.carrera_id IS NOT NULL THEN
                UPDATE public.profiles
                SET carreras_ids = array_append(COALESCE(carreras_ids, ARRAY[]::bigint[]), _jugador_record.carrera_id)
                WHERE id = NEW.id AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[_jugador_record.carrera_id]);
            END IF;
            IF _jugador_record.disciplina_id IS NOT NULL THEN
                INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
                VALUES (NEW.id, _jugador_record.disciplina_id)
                ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- C. Si hubo vínculo, asegurar el rol
    IF _linked THEN
        UPDATE public.profiles
        SET roles = array_append(roles, 'deportista')
        WHERE id = NEW.id AND NOT ('deportista' = ANY(COALESCE(roles, ARRAY[]::text[])));

        -- Propagar a partidos
        UPDATE public.partidos p SET athlete_a_id = NEW.id FROM public.roster_partido rp
        WHERE rp.jugador_id IN (SELECT id FROM public.jugadores WHERE profile_id = NEW.id)
          AND rp.equipo_a_or_b = 'equipo_a' AND rp.partido_id = p.id AND (p.athlete_a_id IS NULL OR p.athlete_a_id <> NEW.id);

        UPDATE public.partidos p SET athlete_b_id = NEW.id FROM public.roster_partido rp
        WHERE rp.jugador_id IN (SELECT id FROM public.jugadores WHERE profile_id = NEW.id)
          AND rp.equipo_a_or_b = 'equipo_b' AND rp.partido_id = p.id AND (p.athlete_b_id IS NULL OR p.athlete_b_id <> NEW.id);
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. REPARACIÓN RETROACTIVA (BACKFILL)
-- Este bloque vincula a todos los que ya se registraron pero quedaron a medias por el error anterior.

-- A. Vincular por Email
UPDATE public.jugadores j
SET profile_id = p.id, email = p.email
FROM public.profiles p
WHERE LOWER(j.email) = LOWER(p.email) AND j.profile_id IS NULL;

-- B. Vincular por Nombre
UPDATE public.jugadores j
SET profile_id = p.id, email = p.email
FROM public.profiles p
WHERE UPPER(TRIM(j.nombre)) = UPPER(TRIM(p.full_name)) AND j.profile_id IS NULL;

-- C. Otorgar rol 'deportista' a todos los que ahora tienen un vínculo
UPDATE public.profiles p
SET roles = array_append(roles, 'deportista')
WHERE EXISTS (SELECT 1 FROM public.jugadores j WHERE j.profile_id = p.id)
  AND NOT ('deportista' = ANY(COALESCE(roles, ARRAY[]::text[])));

-- D. Sincronizar carreras_ids para los existentes
UPDATE public.profiles p
SET carreras_ids = (
    SELECT array_agg(DISTINCT j.carrera_id)
    FROM public.jugadores j
    WHERE j.profile_id = p.id AND j.carrera_id IS NOT NULL
)
WHERE EXISTS (SELECT 1 FROM public.jugadores j WHERE j.profile_id = p.id);

-- E. Sincronizar disciplinas para los existentes
INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
SELECT DISTINCT profile_id, disciplina_id
FROM public.jugadores
WHERE profile_id IS NOT NULL AND disciplina_id IS NOT NULL
ON CONFLICT DO NOTHING;

COMMIT;
