-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Finalize Jugadores Normalization
-- Date: 2026-03-23
-- Description:
--   Completes the jugadores normalization by:
--   1. Dropping old FK on olympics_eventos.jugador_id (was referencing olympics_jugadores_old)
--   2. Adding new FK on olympics_eventos.jugador_id pointing to jugadores (new normalized table)
--   3. Copying jugador_id_normalized values → jugador_id for any events inserted after
--      the normalization migration that may have used jugador_id_normalized
--   4. Updating view_top_scorers to COALESCE both columns so old and new events show
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- STEP 1: Populate jugador_id_normalized for old events via lookup in olympics_jugadores_old
UPDATE public.olympics_eventos oe
SET jugador_id_normalized = j.id
FROM public.jugadores j
LEFT JOIN public.olympics_jugadores_old oj ON j.nombre = oj.nombre
  AND j.numero IS NOT DISTINCT FROM oj.numero
  AND j.profile_id IS NOT DISTINCT FROM oj.profile_id
WHERE oe.jugador_id_normalized IS NULL
  AND oe.jugador_id IS NOT NULL
  AND oj.id = oe.jugador_id;

-- STEP 2: Clear old jugador_id column (it references olympics_jugadores_old which is invalid)
UPDATE public.olympics_eventos
SET jugador_id = NULL;

-- STEP 3: Drop old FK constraint on jugador_id
ALTER TABLE public.olympics_eventos
DROP CONSTRAINT IF EXISTS olympics_eventos_jugador_id_fkey;

-- STEP 4: Now copy jugador_id_normalized → jugador_id for new unified column
UPDATE public.olympics_eventos
SET jugador_id = jugador_id_normalized
WHERE jugador_id IS NULL AND jugador_id_normalized IS NOT NULL;

-- STEP 5: Add new FK on jugador_id pointing to jugadores (new normalized table)
ALTER TABLE public.olympics_eventos
ADD CONSTRAINT olympics_eventos_jugador_id_fkey
FOREIGN KEY (jugador_id) REFERENCES public.jugadores(id) ON DELETE SET NULL;

-- STEP 5: Update view_top_scorers to use COALESCE so both old and new events are included
DROP VIEW IF EXISTS public.view_top_scorers;

CREATE VIEW public.view_top_scorers AS
SELECT
    j.id AS jugador_id,
    j.nombre,
    j.numero,
    j.profile_id,
    d.name AS disciplina,
    COUNT(*) FILTER (WHERE e.tipo_evento = 'gol') AS goles,
    SUM(
        CASE
            WHEN e.tipo_evento = 'gol' THEN 1
            WHEN e.tipo_evento = 'punto' THEN 1
            WHEN e.tipo_evento = 'punto_1' THEN 1
            WHEN e.tipo_evento = 'punto_2' THEN 2
            WHEN e.tipo_evento = 'punto_3' THEN 3
            ELSE 0
        END
    ) AS puntos_totales,
    COUNT(DISTINCT e.partido_id) AS partidos_jugados,
    MAX(sub.puntos_partido) AS mejor_partido
FROM public.olympics_eventos e
JOIN public.jugadores j ON j.id = COALESCE(e.jugador_id_normalized, e.jugador_id)
JOIN public.partidos p ON p.id = e.partido_id
JOIN public.disciplinas d ON d.id = p.disciplina_id
LEFT JOIN LATERAL (
    SELECT
        SUM(
            CASE
                WHEN e2.tipo_evento = 'gol' THEN 1
                WHEN e2.tipo_evento = 'punto' THEN 1
                WHEN e2.tipo_evento = 'punto_1' THEN 1
                WHEN e2.tipo_evento = 'punto_2' THEN 2
                WHEN e2.tipo_evento = 'punto_3' THEN 3
                ELSE 0
            END
        ) AS puntos_partido
    FROM public.olympics_eventos e2
    WHERE COALESCE(e2.jugador_id_normalized, e2.jugador_id) = j.id
      AND e2.partido_id = e.partido_id
      AND e2.tipo_evento IN ('gol', 'punto', 'punto_1', 'punto_2', 'punto_3')
) sub ON true
WHERE e.tipo_evento IN ('gol', 'punto', 'punto_1', 'punto_2', 'punto_3')
  AND p.estado = 'finalizado'
GROUP BY j.id, j.nombre, j.numero, j.profile_id, d.name
HAVING SUM(
    CASE
        WHEN e.tipo_evento = 'gol' THEN 1
        WHEN e.tipo_evento = 'punto' THEN 1
        WHEN e.tipo_evento = 'punto_1' THEN 1
        WHEN e.tipo_evento = 'punto_2' THEN 2
        WHEN e.tipo_evento = 'punto_3' THEN 3
        ELSE 0
    END
) > 0
ORDER BY puntos_totales DESC;

GRANT SELECT ON public.view_top_scorers TO authenticated, anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
