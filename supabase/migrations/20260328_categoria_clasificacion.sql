-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Categoria field for individual sports classification
-- Date: 2026-03-28
-- Description:
--   Adds `categoria` (principiante/intermedio/avanzado) to clasificacion_disciplina
--   so Tenis, Tenis de Mesa and Natación sub-tournaments can each award points
--   independently to the same carrera.
--   Updates UNIQUE constraint and view to include the new field.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add categoria column
--    NULL = sport without skill levels (team sports, Ajedrez)
--    Non-null = principiante | intermedio | avanzado
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.clasificacion_disciplina
    ADD COLUMN IF NOT EXISTS categoria TEXT
    CHECK (categoria IN ('principiante', 'intermedio', 'avanzado') OR categoria IS NULL);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Replace UNIQUE constraint to include categoria
--    NULLS NOT DISTINCT ensures two NULLs still conflict
--    (same discipline + carrera + gender + no category = one row)
-- ─────────────────────────────────────────────────────────────────────────────
-- Drop both the old auto-named constraint and any previous run of this migration
ALTER TABLE public.clasificacion_disciplina
    DROP CONSTRAINT IF EXISTS clasificacion_disciplina_disciplina_id_carrera_id_genero_key;

ALTER TABLE public.clasificacion_disciplina
    DROP CONSTRAINT IF EXISTS clasificacion_disciplina_unique;

ALTER TABLE public.clasificacion_disciplina
    ADD CONSTRAINT clasificacion_disciplina_unique
    UNIQUE NULLS NOT DISTINCT (disciplina_id, carrera_id, genero, categoria);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Rebuild view to expose categoria in the per-discipline breakdown
-- ─────────────────────────────────────────────────────────────────────────────
DROP VIEW IF EXISTS public.view_clasificacion_general;

CREATE VIEW public.view_clasificacion_general AS
SELECT
    c.id                                             AS carrera_id,
    c.nombre                                         AS carrera_nombre,
    c.escudo_url,
    COALESCE(SUM(cd.puntos_obtenidos), 0)            AS total_puntos,
    COUNT(cd.id)                                     AS disciplinas_participadas,
    JSONB_AGG(
        JSONB_BUILD_OBJECT(
            'disciplina_id',     d.id,
            'disciplina_nombre', d.name,
            'genero',            cd.genero,
            'categoria',         cd.categoria,
            'posicion',          cd.posicion,
            'puntos',            cd.puntos_obtenidos
        ) ORDER BY cd.puntos_obtenidos DESC
    ) FILTER (WHERE cd.id IS NOT NULL)               AS detalle_disciplinas
FROM public.carreras c
LEFT JOIN public.clasificacion_disciplina cd ON cd.carrera_id = c.id
LEFT JOIN public.disciplinas d ON d.id = cd.disciplina_id
GROUP BY c.id, c.nombre, c.escudo_url
ORDER BY total_puntos DESC, carrera_nombre ASC;

GRANT SELECT ON public.view_clasificacion_general TO authenticated, anon;

-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';
