-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Fix Career Wins Tracking System
-- Date: 2026-04-11
-- Description:
--   The original view_career_stats used singular carrera_a_id / carrera_b_id
--   columns, which were deprecated in favor of carrera_a_ids / carrera_b_ids
--   arrays (to support fusion teams). This migration:
--
--   1. Backfills carrera_a_ids / carrera_b_ids for ALL existing partidos that
--      have carrera_a_id / carrera_b_id set but empty arrays (legacy data).
--
--   2. Also backfills from delegaciones.carrera_ids when available (richer data
--      for fusion teams that would be missed by the singular FK alone).
--
--   3. Recreates view_career_stats using GIN-indexed array containment so EVERY
--      match — including fusions — is correctly attributed to each career.
--      Also adds race match support (marcador_detalle->>'tipo' = 'carrera').
--
--   4. Adds an AFTER UPDATE trigger on partidos that auto-syncs carrera_a_ids /
--      carrera_b_ids from their linked delegacion whenever the FK changes.
--      This guarantees future imports never leave arrays stale.
--
--   5. Recreates view_clasificacion_general (no change, idempotent refresh).
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Backfill carrera_a_ids / carrera_b_ids from singular FKs
--         (Covers matches created before array columns existed)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Side A: if array is empty and singular FK exists → seed from singular FK
UPDATE public.partidos
SET carrera_a_ids = ARRAY[carrera_a_id]
WHERE carrera_a_id IS NOT NULL
  AND (carrera_a_ids IS NULL OR carrera_a_ids = '{}');

-- Side B
UPDATE public.partidos
SET carrera_b_ids = ARRAY[carrera_b_id]
WHERE carrera_b_id IS NOT NULL
  AND (carrera_b_ids IS NULL OR carrera_b_ids = '{}');


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Upgrade arrays from delegaciones.carrera_ids
--         This is the most important step for fusion teams.
--         A delegación may have [7, 12] for "Ing. Eléctrica / Ciencia de Datos".
--         The old singular FK only stored one of those, losing the other career.
-- ═══════════════════════════════════════════════════════════════════════════════

-- Side A: Use delegacion_a_id → delegaciones.carrera_ids if that array is richer
UPDATE public.partidos p
SET carrera_a_ids = d.carrera_ids
FROM public.delegaciones d
WHERE d.id = p.delegacion_a_id
  AND CARDINALITY(d.carrera_ids) > 0                   -- delegacion has data
  AND CARDINALITY(d.carrera_ids) > CARDINALITY(COALESCE(p.carrera_a_ids, '{}'));  -- richer than current

-- Side B
UPDATE public.partidos p
SET carrera_b_ids = d.carrera_ids
FROM public.delegaciones d
WHERE d.id = p.delegacion_b_id
  AND CARDINALITY(d.carrera_ids) > 0
  AND CARDINALITY(d.carrera_ids) > CARDINALITY(COALESCE(p.carrera_b_ids, '{}'));


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 3: Auto-sync trigger — keeps arrays in sync automatically on future imports
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.sync_carrera_ids_from_delegacion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    ids_a BIGINT[];
    ids_b BIGINT[];
BEGIN
    -- Resolve carrera_ids from delegacion_a_id
    IF NEW.delegacion_a_id IS NOT NULL THEN
        SELECT carrera_ids INTO ids_a
        FROM public.delegaciones
        WHERE id = NEW.delegacion_a_id;

        IF ids_a IS NOT NULL AND CARDINALITY(ids_a) > 0 THEN
            NEW.carrera_a_ids := ids_a;
        END IF;
    END IF;

    -- Resolve carrera_ids from delegacion_b_id
    IF NEW.delegacion_b_id IS NOT NULL THEN
        SELECT carrera_ids INTO ids_b
        FROM public.delegaciones
        WHERE id = NEW.delegacion_b_id;

        IF ids_b IS NOT NULL AND CARDINALITY(ids_b) > 0 THEN
            NEW.carrera_b_ids := ids_b;
        END IF;
    END IF;

    -- Fallback: if arrays still empty but singular FKs set, use those
    IF (NEW.carrera_a_ids IS NULL OR NEW.carrera_a_ids = '{}') AND NEW.carrera_a_id IS NOT NULL THEN
        NEW.carrera_a_ids := ARRAY[NEW.carrera_a_id];
    END IF;

    IF (NEW.carrera_b_ids IS NULL OR NEW.carrera_b_ids = '{}') AND NEW.carrera_b_id IS NOT NULL THEN
        NEW.carrera_b_ids := ARRAY[NEW.carrera_b_id];
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_carrera_ids ON public.partidos;

CREATE TRIGGER trg_sync_carrera_ids
    BEFORE INSERT OR UPDATE OF delegacion_a_id, delegacion_b_id, carrera_a_id, carrera_b_id
    ON public.partidos
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_carrera_ids_from_delegacion();

COMMENT ON FUNCTION public.sync_carrera_ids_from_delegacion() IS
'BEFORE trigger on partidos: whenever delegacion or carrera FK columns change,
auto-populates the carrera_a_ids / carrera_b_ids denormalized arrays.
This ensures fusion teams (2+ careers sharing a delegacion) are always
fully attributed in the medallero and win-tracking queries.';


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 4: Recreate view_career_stats — now correct for arrays + race matches
-- ═══════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.view_career_stats;

CREATE VIEW public.view_career_stats AS
WITH
-- ── Regular (non-race) match results ────────────────────────────────────────
team_matches AS (
    SELECT
        c.id                                      AS carrera_id,
        p.id                                      AS partido_id,
        CASE
            -- Win: career in side A and A scored more
            WHEN p.carrera_a_ids @> ARRAY[c.id]
             AND COALESCE((p.marcador_detalle->>'goles_a')::int,
                          (p.marcador_detalle->>'sets_a')::int,
                          (p.marcador_detalle->>'total_a')::int,
                          (p.marcador_detalle->>'puntos_a')::int, 0)
               > COALESCE((p.marcador_detalle->>'goles_b')::int,
                          (p.marcador_detalle->>'sets_b')::int,
                          (p.marcador_detalle->>'total_b')::int,
                          (p.marcador_detalle->>'puntos_b')::int, 0)
            THEN 'win'
            -- Win: career in side B and B scored more
            WHEN p.carrera_b_ids @> ARRAY[c.id]
             AND COALESCE((p.marcador_detalle->>'goles_b')::int,
                          (p.marcador_detalle->>'sets_b')::int,
                          (p.marcador_detalle->>'total_b')::int,
                          (p.marcador_detalle->>'puntos_b')::int, 0)
               > COALESCE((p.marcador_detalle->>'goles_a')::int,
                          (p.marcador_detalle->>'sets_a')::int,
                          (p.marcador_detalle->>'total_a')::int,
                          (p.marcador_detalle->>'puntos_a')::int, 0)
            THEN 'win'
            -- Draw
            WHEN COALESCE((p.marcador_detalle->>'goles_a')::int,
                          (p.marcador_detalle->>'sets_a')::int,
                          (p.marcador_detalle->>'total_a')::int,
                          (p.marcador_detalle->>'puntos_a')::int, 0)
               = COALESCE((p.marcador_detalle->>'goles_b')::int,
                          (p.marcador_detalle->>'sets_b')::int,
                          (p.marcador_detalle->>'total_b')::int,
                          (p.marcador_detalle->>'puntos_b')::int, 0)
            THEN 'draw'
            ELSE 'loss'
        END AS result
    FROM public.carreras c
    JOIN public.partidos p
        ON (p.carrera_a_ids @> ARRAY[c.id] OR p.carrera_b_ids @> ARRAY[c.id])
    WHERE p.estado = 'finalizado'
      AND COALESCE(p.marcador_detalle->>'tipo', '') <> 'carrera'   -- exclude race-type matches
      AND (CARDINALITY(p.carrera_a_ids) > 0 OR CARDINALITY(p.carrera_b_ids) > 0)
),

-- ── Race match results (Natación — multi-participant JSON format) ────────────
race_matches AS (
    SELECT
        c.id                                      AS carrera_id,
        p.id                                      AS partido_id,
        CASE (res->>'puesto')::int
            WHEN 1 THEN 'win'
            WHEN 2 THEN 'draw'   -- repurposed: 2nd/3rd are non-losses
            WHEN 3 THEN 'draw'
            ELSE 'loss'
        END AS result
    FROM public.carreras c
    JOIN public.partidos p ON p.estado = 'finalizado'
         AND COALESCE(p.marcador_detalle->>'tipo', '') = 'carrera'
    JOIN LATERAL (
        -- Unnest the participantes / resultados JSON array
        SELECT value AS res
        FROM jsonb_array_elements(
            COALESCE(
                p.marcador_detalle->'participantes',
                p.marcador_detalle->'resultados',
                '[]'::jsonb
            )
        )
    ) AS r ON true
    WHERE
        -- Check if this career appears in the participant's carrera_ids array
        EXISTS (
            SELECT 1
            FROM jsonb_array_elements_text(
                COALESCE(r.res->'carrera_ids', '[]'::jsonb)
            ) AS cid
            WHERE cid::bigint = c.id
        )
        OR (r.res->>'carrera_id')::bigint = c.id   -- legacy singular field
),

-- ── Union both result sets ───────────────────────────────────────────────────
all_results AS (
    SELECT * FROM team_matches
    UNION ALL
    SELECT * FROM race_matches
)

-- ── Final aggregation ────────────────────────────────────────────────────────
SELECT
    c.id                                          AS carrera_id,
    c.nombre                                      AS carrera_nombre,
    c.escudo_url,
    COUNT(DISTINCT ar.partido_id)                 AS total_partidos,
    COUNT(DISTINCT ar.partido_id) FILTER (WHERE ar.result = 'win')   AS victorias,
    COUNT(DISTINCT ar.partido_id) FILTER (WHERE ar.result = 'draw')  AS empates,
    COUNT(DISTINCT ar.partido_id) FILTER (WHERE ar.result = 'loss')  AS derrotas
FROM public.carreras c
LEFT JOIN all_results ar ON ar.carrera_id = c.id
GROUP BY c.id, c.nombre, c.escudo_url
ORDER BY victorias DESC, total_partidos DESC;

GRANT SELECT ON public.view_career_stats TO authenticated, anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 5: Refresh view_clasificacion_general (idempotent, no schema change)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.view_clasificacion_general;

CREATE VIEW public.view_clasificacion_general AS
SELECT
    c.id                                            AS carrera_id,
    c.nombre                                        AS carrera_nombre,
    c.escudo_url,
    COALESCE(SUM(cd.puntos_obtenidos), 0)           AS total_puntos,
    COUNT(cd.id)                                    AS disciplinas_participadas,
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'disciplina_id',      d.id,
            'disciplina_nombre',  d.name,
            'genero',             cd.genero,
            'posicion',           cd.posicion,
            'puntos',             cd.puntos_obtenidos
        ) ORDER BY cd.puntos_obtenidos DESC
    ) FILTER (WHERE cd.id IS NOT NULL)              AS detalle_disciplinas
FROM public.carreras c
LEFT JOIN public.clasificacion_disciplina cd ON cd.carrera_id = c.id
LEFT JOIN public.disciplinas d ON d.id = cd.disciplina_id
GROUP BY c.id, c.nombre, c.escudo_url
ORDER BY total_puntos DESC, carrera_nombre ASC;

GRANT SELECT ON public.view_clasificacion_general TO authenticated, anon;


-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 6: Summary verification query (informational)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Run a quick check to see backfill coverage
DO $$
DECLARE
    v_total    INT;
    v_no_ids   INT;
    v_fixed_a  INT;
    v_fixed_b  INT;
BEGIN
    SELECT COUNT(*) INTO v_total FROM public.partidos WHERE estado = 'finalizado';

    SELECT COUNT(*) INTO v_no_ids
    FROM public.partidos
    WHERE estado = 'finalizado'
      AND CARDINALITY(carrera_a_ids) = 0
      AND CARDINALITY(carrera_b_ids) = 0;

    SELECT COUNT(*) INTO v_fixed_a
    FROM public.partidos
    WHERE estado = 'finalizado'
      AND CARDINALITY(carrera_a_ids) > 0;

    SELECT COUNT(*) INTO v_fixed_b
    FROM public.partidos
    WHERE estado = 'finalizado'
      AND CARDINALITY(carrera_b_ids) > 0;

    RAISE NOTICE '=== Career Wins Backfill Report ===';
    RAISE NOTICE 'Total finished matches: %', v_total;
    RAISE NOTICE 'Matches with carrera_a_ids: %', v_fixed_a;
    RAISE NOTICE 'Matches with carrera_b_ids: %', v_fixed_b;
    RAISE NOTICE 'Matches still missing BOTH arrays: %', v_no_ids;
    IF v_no_ids > 0 THEN
        RAISE NOTICE 'NOTE: % matches have no carrera IDs. These may be individual-sport or race matches.', v_no_ids;
    END IF;
END;
$$;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
