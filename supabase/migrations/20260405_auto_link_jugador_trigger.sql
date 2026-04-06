-- ─────────────────────────────────────────────────────────────────────────────
-- 20260405_auto_link_jugador_trigger.sql
-- Trigger que auto-vincula jugadores a profiles cuando se crea/actualiza
-- un perfil. Funciona con SECURITY DEFINER para bypassar RLS.
--
-- Lógica:
--   1. Intenta match por email
--   2. Si no hay email match, intenta match exacto por nombre (case-insensitive)
--   3. Propaga el profile_id a las columnas athlete_X_id de partidos vía roster
--   4. Sincroniza carrera_id → profiles.carreras_ids
--   5. Agrega rol 'deportista' al perfil
--   6. Agrega disciplina_id a profile_disciplinas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_link_jugador_on_profile()
RETURNS TRIGGER AS $$
DECLARE
    _jugador_id   BIGINT;
    _carrera_id   BIGINT;
    _disciplina_id BIGINT;
    _linked       BOOLEAN := FALSE;
BEGIN
    -- 1. Try email match
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
        UPDATE public.jugadores
        SET profile_id = NEW.id,
            email = COALESCE(email, NEW.email)
        WHERE LOWER(email) = LOWER(NEW.email)
          AND profile_id IS NULL
        RETURNING id, carrera_id, disciplina_id INTO _jugador_id, _carrera_id, _disciplina_id;

        IF _jugador_id IS NOT NULL THEN
            _linked := TRUE;
        END IF;
    END IF;

    -- 2. If no email match, try exact name match (case-insensitive, trimmed)
    IF NOT _linked AND NEW.full_name IS NOT NULL AND NEW.full_name <> '' THEN
        UPDATE public.jugadores
        SET profile_id = NEW.id,
            email = COALESCE(email, NEW.email)
        WHERE UPPER(TRIM(nombre)) = UPPER(TRIM(NEW.full_name))
          AND profile_id IS NULL
        RETURNING id, carrera_id, disciplina_id INTO _jugador_id, _carrera_id, _disciplina_id;

        IF _jugador_id IS NOT NULL THEN
            _linked := TRUE;
        END IF;
    END IF;

    IF NOT _linked THEN
        RETURN NEW;
    END IF;

    -- 3. Propagar profile_id a partidos via roster_partido
    UPDATE public.partidos p
    SET athlete_a_id = NEW.id
    FROM public.roster_partido rp
    WHERE rp.jugador_id = _jugador_id
      AND rp.equipo_a_or_b = 'equipo_a'
      AND rp.partido_id = p.id
      AND (p.athlete_a_id IS NULL OR p.athlete_a_id <> NEW.id);

    UPDATE public.partidos p
    SET athlete_b_id = NEW.id
    FROM public.roster_partido rp
    WHERE rp.jugador_id = _jugador_id
      AND rp.equipo_a_or_b = 'equipo_b'
      AND rp.partido_id = p.id
      AND (p.athlete_b_id IS NULL OR p.athlete_b_id <> NEW.id);

    -- 4. Sincronizar carrera al perfil (agregar al array si no está ya)
    IF _carrera_id IS NOT NULL THEN
        UPDATE public.profiles
        SET carreras_ids = array_append(
            COALESCE(carreras_ids, ARRAY[]::bigint[]),
            _carrera_id
        )
        WHERE id = NEW.id
          AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[_carrera_id]);
    END IF;

    -- 5. Agregar rol 'deportista' si no lo tiene
    UPDATE public.profiles
    SET roles = array_append(roles, 'deportista')
    WHERE id = NEW.id
      AND NOT ('deportista' = ANY(COALESCE(roles, ARRAY[]::text[])));

    -- 6. Registrar disciplina en profile_disciplinas
    IF _disciplina_id IS NOT NULL THEN
        INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
        VALUES (NEW.id, _disciplina_id)
        ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire on INSERT (new user) and UPDATE (profile changes)
DROP TRIGGER IF EXISTS trg_auto_link_jugador ON public.profiles;
CREATE TRIGGER trg_auto_link_jugador
    AFTER INSERT OR UPDATE OF email, full_name ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_link_jugador_on_profile();
