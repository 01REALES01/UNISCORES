-- ─────────────────────────────────────────────────────────────────────────────
-- 20260408_backfill_natacion_participant_profiles.sql
-- Parche retroactivo: llena profile_id en marcador_detalle.participantes[]
-- para todos los partidos de natación (tipo='carrera').
--
-- Prerequisito: ya debe haberse ejecutado 20260405_backfill_jugador_profiles.sql
-- para que jugadores.profile_id esté vinculado.
-- ─────────────────────────────────────────────────────────────────────────────

-- PASO 1: Parche vía jugador_id (cuando el participant tiene el campo)
UPDATE public.partidos p
SET marcador_detalle = jsonb_set(
    p.marcador_detalle,
    '{participantes}',
    (
        SELECT jsonb_agg(
            CASE
                WHEN (elem->>'jugador_id') IS NOT NULL
                     AND j.profile_id IS NOT NULL
                     AND ((elem->>'profile_id') IS NULL OR (elem->>'profile_id') = 'null')
                THEN elem || jsonb_build_object('profile_id', j.profile_id::text)
                ELSE elem
            END
        )
        FROM jsonb_array_elements(p.marcador_detalle->'participantes') AS elem
        LEFT JOIN public.jugadores j ON j.id = (elem->>'jugador_id')::int
    )
)
WHERE (p.marcador_detalle->>'tipo') = 'carrera'
  AND p.marcador_detalle ? 'participantes'
  AND jsonb_array_length(p.marcador_detalle->'participantes') > 0;

-- PASO 2: Parche vía nombre + carrera_id (para participants sin jugador_id)
UPDATE public.partidos p
SET marcador_detalle = jsonb_set(
    p.marcador_detalle,
    '{participantes}',
    (
        SELECT jsonb_agg(
            CASE
                WHEN ((elem->>'profile_id') IS NULL OR (elem->>'profile_id') = 'null')
                     AND j.profile_id IS NOT NULL
                THEN elem || jsonb_build_object('profile_id', j.profile_id::text)
                ELSE elem
            END
        )
        FROM jsonb_array_elements(p.marcador_detalle->'participantes') AS elem
        LEFT JOIN public.jugadores j
            ON UPPER(TRIM(j.nombre)) = UPPER(TRIM(elem->>'nombre'))
           AND j.carrera_id = (elem->>'carrera_id')::int
    )
)
WHERE (p.marcador_detalle->>'tipo') = 'carrera'
  AND p.marcador_detalle ? 'participantes'
  AND jsonb_array_length(p.marcador_detalle->'participantes') > 0;

-- Verificación: cuántos participantes quedaron con/sin profile_id
SELECT
    COUNT(*) FILTER (WHERE (elem->>'profile_id') IS NOT NULL AND (elem->>'profile_id') <> 'null') AS con_perfil,
    COUNT(*) FILTER (WHERE (elem->>'profile_id') IS NULL OR (elem->>'profile_id') = 'null')       AS sin_perfil,
    COUNT(*) AS total_participantes
FROM public.partidos p,
     jsonb_array_elements(p.marcador_detalle->'participantes') AS elem
WHERE (p.marcador_detalle->>'tipo') = 'carrera';
