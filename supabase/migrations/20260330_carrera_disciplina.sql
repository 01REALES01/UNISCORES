-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: carrera_disciplina — VIEW derived from delegaciones
-- Date: 2026-03-30
-- Description:
--   Instead of a separate table, carrera_disciplina is a VIEW that unnests
--   delegaciones.carrera_ids. This way it is always in sync with the schedule
--   import — no extra upload or sync step needed.
--
--   delegaciones (created by the schedule import) already has:
--     - nombre        → equipo_nombre (e.g. "Ing. Eléctrica / Ciencia de Datos")
--     - disciplina_id → the sport
--     - genero        → gender
--     - carrera_ids[] → one or more carrera IDs (fusions expand automatically)
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- Drop the table if it was previously created (idempotent)
DROP TABLE IF EXISTS public.carrera_disciplina CASCADE;

-- Drop the view if it exists from a previous run
DROP VIEW IF EXISTS public.carrera_disciplina;

-- ─────────────────────────────────────────────────────────────────────────────
-- VIEW: carrera_disciplina
-- Unnests delegaciones.carrera_ids so each (carrera, disciplina, genero) pair
-- is a single readable row — exactly what the UI queries need.
--
-- Example: delegacion "Ing. Eléctrica / Ciencia de Datos" with carrera_ids=[3,7]
-- produces TWO rows:
--   { carrera_id: 3, disciplina_id: 1, genero: 'masculino', equipo_nombre: 'Ing. Eléctrica / Ciencia de Datos' }
--   { carrera_id: 7, disciplina_id: 1, genero: 'masculino', equipo_nombre: 'Ing. Eléctrica / Ciencia de Datos' }
-- ─────────────────────────────────────────────────────────────────────────────

CREATE VIEW public.carrera_disciplina AS
SELECT
    c.carrera_id,
    d.disciplina_id,
    d.genero,
    d.nombre   AS equipo_nombre,
    d.id       AS delegacion_id,
    d.created_at
FROM
    public.delegaciones d,
    LATERAL UNNEST(d.carrera_ids) AS c(carrera_id)
WHERE
    d.disciplina_id IS NOT NULL
    AND d.genero IS NOT NULL
    AND CARDINALITY(d.carrera_ids) > 0;

GRANT SELECT ON public.carrera_disciplina TO authenticated, anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
