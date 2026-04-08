-- =====================================================
-- SINCRONIZACIÓN RETROACTIVA DE ROLES (SCRIPT FORENSE)
-- =====================================================

-- Esta función busca a todos los jugadores que ya fueron creados o importados del Excel
-- en el pasado y se asegura de empujarles sus roles y carreras hacia su Perfil Público,
-- saltándose la necesidad de que alguien inicie sesión de nuevo o de re-guardar el jugador.

DO $$
DECLARE
   r RECORD;
BEGIN
   -- Buscamos todos los jugadores que YA lograron emparejarse con un usuario (id)
   -- pero que probablemente no recibieron su rol porque los triggers no existian aún.
   FOR r IN SELECT * FROM public.jugadores WHERE profile_id IS NOT NULL LOOP
      
      -- 1) Obligar la sincronización de su Facultad / Carrera
      IF r.carrera_id IS NOT NULL THEN
          UPDATE public.profiles
          SET carreras_ids = array_append(
              COALESCE(carreras_ids, ARRAY[]::bigint[]),
              r.carrera_id
          )
          WHERE id = r.profile_id
            AND NOT (COALESCE(carreras_ids, ARRAY[]::bigint[]) @> ARRAY[r.carrera_id]);
      END IF;

      -- 2) Obligar la inyección del rol 'deportista'
      UPDATE public.profiles
      SET roles = array_append(roles, 'deportista')
      WHERE id = r.profile_id
        AND NOT ('deportista' = ANY(COALESCE(roles, ARRAY[]::text[])));

      -- 3) Obligar la asignación de su Deporte / Disciplina particular
      IF r.disciplina_id IS NOT NULL THEN
          INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
          VALUES (r.profile_id, r.disciplina_id)
          ON CONFLICT DO NOTHING;
      END IF;

   END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Por seguridad extra, le damos "un empujón" adicional a cualquier jugador 
-- completamente huérfano (sin ID en lo absoluto) para que vuelva a intentar el match por correo.
UPDATE public.jugadores SET nombre = nombre WHERE profile_id IS NULL;
