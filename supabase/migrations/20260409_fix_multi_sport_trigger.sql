-- ─────────────────────────────────────────────────────────────────────────────
-- 20260409_fix_multi_sport_trigger.sql
-- Arregla el error de "query returned more than one row" cuando un 
-- deportista está en múltiples deportes.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_link_jugador_on_profile()
RETURNS TRIGGER AS $$
DECLARE
    _jugador_record RECORD;
    _linked         BOOLEAN := FALSE;
BEGIN
    -- 1. Intentar vincular por Email
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
        FOR _jugador_record IN 
            UPDATE public.jugadores
            SET profile_id = NEW.id,
                email = COALESCE(email, NEW.email)
            WHERE LOWER(email) = LOWER(NEW.email)
              AND (profile_id IS NULL OR profile_id = NEW.id) -- Permitir re-vinculación técnica
            RETURNING id, carrera_id, disciplina_id
        LOOP
            _linked := TRUE;
            
            -- Vincular Carrera si existe
            IF _jugador_record.carrera_id IS NOT NULL THEN
                UPDATE public.profiles
                SET carreras_ids = array_append(
                    COALESCE(carreras_ids, ARRAY[]::bigint[]),
                    _jugador_record.carrera_id
                )
                WHERE id = NEW.id
                  AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[_jugador_record.carrera_id]);
            END IF;

            -- Vincular Disciplina
            IF _jugador_record.disciplina_id IS NOT NULL THEN
                INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
                VALUES (NEW.id, _jugador_record.disciplina_id)
                ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 2. Si no hubo vínculo por email, intentar por Nombre Exacto (Case-Insensitive)
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
            
            -- Vincular Carrera
            IF _jugador_record.carrera_id IS NOT NULL THEN
                UPDATE public.profiles
                SET carreras_ids = array_append(
                    COALESCE(carreras_ids, ARRAY[]::bigint[]),
                    _jugador_record.carrera_id
                )
                WHERE id = NEW.id
                  AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[_jugador_record.carrera_id]);
            END IF;

            -- Vincular Disciplina
            IF _jugador_record.disciplina_id IS NOT NULL THEN
                INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
                VALUES (NEW.id, _jugador_record.disciplina_id)
                ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
            END IF;
        END LOOP;
    END IF;

    -- 3. Si se vinculó aunque sea un registro, otorgar rol 'deportista'
    IF _linked THEN
        UPDATE public.profiles
        SET roles = array_append(roles, 'deportista')
        WHERE id = NEW.id
          AND NOT ('deportista' = ANY(COALESCE(roles, ARRAY[]::text[])));

        -- Propagar a partidos (esto se puede simplificar pero mantenemos lógica original corregida)
        UPDATE public.partidos p
        SET athlete_a_id = NEW.id
        FROM public.roster_partido rp
        JOIN public.jugadores j ON j.id = rp.jugador_id
        WHERE j.profile_id = NEW.id
          AND rp.equipo_a_or_b = 'equipo_a'
          AND rp.partido_id = p.id
          AND (p.athlete_a_id IS NULL OR p.athlete_a_id <> NEW.id);

        UPDATE public.partidos p
        SET athlete_b_id = NEW.id
        FROM public.roster_partido rp
        JOIN public.jugadores j ON j.id = rp.jugador_id
        WHERE j.profile_id = NEW.id
          AND rp.equipo_a_or_b = 'equipo_b'
          AND rp.partido_id = p.id
          AND (p.athlete_b_id IS NULL OR p.athlete_b_id <> NEW.id);
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Fallback seguro para no romper el registro de usuarios
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
