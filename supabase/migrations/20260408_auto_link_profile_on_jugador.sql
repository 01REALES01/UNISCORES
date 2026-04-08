-- ─────────────────────────────────────────────────────────────────────────────
-- 20260408_auto_link_profile_on_jugador.sql
-- Trigger reverso: Vincula automáticamente un Perfil existente cuando
-- el administrador inscribe a un jugador en un partido (tabla jugadores).
--
-- Lógica:
--   1. Intenta match por email (PRIORIDAD)
--   2. Si no hay email, intenta match exacto por nombre
--   3. Enlaza el id del usuario al jugador.
--   4. Le otorga automáticamente el rol 'deportista' a su perfil.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.auto_link_profile_on_jugador()
RETURNS TRIGGER AS $$
DECLARE
    _profile_id   UUID;
    _linked       BOOLEAN := FALSE;
BEGIN
    -- 1. Tratar de hacer Match por Correo (Prioridad Maxima)
    IF NEW.email IS NOT NULL AND NEW.email <> '' THEN
        SELECT id INTO _profile_id
        FROM public.profiles
        WHERE LOWER(email) = LOWER(NEW.email)
        LIMIT 1;

        IF _profile_id IS NOT NULL THEN
            _linked := TRUE;
        END IF;
    END IF;

    -- 2. Si no hubo match por correo, usar búsqueda sensitiva de Nombre Exacto
    IF NOT _linked AND NEW.nombre IS NOT NULL AND NEW.nombre <> '' THEN
        SELECT id INTO _profile_id
        FROM public.profiles
        WHERE UPPER(TRIM(full_name)) = UPPER(TRIM(NEW.nombre))
        LIMIT 1;

        IF _profile_id IS NOT NULL THEN
            _linked := TRUE;
        END IF;
    END IF;

    -- Si no hubo coincidencias, dejamos que la fila avance normalmente y retornamos
    IF NOT _linked THEN
        RETURN NEW;
    END IF;

    -- 3. Vincular localmente! (Guardamos el id del usuario de la app dentro del jugador asignado por el admin antes de insertarlo en DB)
    NEW.profile_id := _profile_id;

    -- 4. Extender Propiedades al Perfil del Usuario
    IF _profile_id IS NOT NULL THEN
        
        -- A) Sincronizar la carrera del evento al catálogo de carreras del estudiante
        IF NEW.carrera_id IS NOT NULL THEN
            UPDATE public.profiles
            SET carreras_ids = array_append(
                COALESCE(carreras_ids, ARRAY[]::bigint[]),
                NEW.carrera_id
            )
            WHERE id = _profile_id
              AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[NEW.carrera_id]);
        END IF;

        -- B) OTORGAR ROL "DEPORTISTA" Automáticamente
        UPDATE public.profiles
        SET roles = array_append(roles, 'deportista')
        WHERE id = _profile_id
          AND NOT ('deportista' = ANY(COALESCE(roles, ARRAY[]::text[])));

        -- C) Registrar deporte personal al usuario
        IF NEW.disciplina_id IS NOT NULL THEN
            INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
            VALUES (_profile_id, NEW.disciplina_id)
            ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
        END IF;
        
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Disparador ANTES del insert o update (BEFORE) para poder modificar el `NEW.profile_id` guardándolo directo a la tabla.
DROP TRIGGER IF EXISTS trg_auto_link_profile_on_jugador ON public.jugadores;
CREATE TRIGGER trg_auto_link_profile_on_jugador
    BEFORE INSERT OR UPDATE OF email, nombre ON public.jugadores
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_link_profile_on_jugador();

-- ─────────────────────────────────────────────────────────────────────────────
-- RETROACTIVO: RE-ESCANEAR A LOS JUGADORES EXISTENTES 
-- Esto asegurará que el gatillo conecte a cualquier jugador viejo que se hubiera atorado
-- ─────────────────────────────────────────────────────────────────────────────
UPDATE public.jugadores SET nombre = nombre WHERE profile_id IS NULL;
