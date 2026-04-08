-- ══════════════════════════════════════════════════════════════════
-- FIX: Actualizar partidos donde sigue apareciendo "CIENCIA POLITICA"
--      como equipo independiente en Fútbol Masculino
-- ══════════════════════════════════════════════════════════════════

-- ── 1. DIAGNÓSTICO: ver qué partidos afecta ─────────────────────────────────

SELECT
    p.id,
    p.equipo_a,
    p.equipo_b,
    p.carrera_a_ids,
    p.carrera_b_ids,
    p.estado,
    p.fecha
FROM partidos p
JOIN disciplinas dis ON dis.id = p.disciplina_id
WHERE dis.name = 'Fútbol'
  AND p.genero = 'masculino'
  AND (
    p.equipo_a ILIKE '%ciencia pol%'
    OR p.equipo_b ILIKE '%ciencia pol%'
    OR (SELECT id FROM carreras WHERE nombre = 'Ciencia Política y Gobierno') = ANY(p.carrera_a_ids)
    OR (SELECT id FROM carreras WHERE nombre = 'Ciencia Política y Gobierno') = ANY(p.carrera_b_ids)
  )
ORDER BY p.fecha;


-- ── 2. FIX: Actualizar nombre y carrera_ids en todos esos partidos ──────────

DO $$
DECLARE
    v_cp_id       BIGINT;
    v_cd_id       BIGINT;
    v_futbol_id   BIGINT;
    v_nuevo_nombre TEXT;
    v_new_ids     BIGINT[];
BEGIN
    SELECT id INTO v_cp_id FROM carreras WHERE nombre = 'Ciencia Política y Gobierno';
    SELECT id INTO v_cd_id FROM carreras WHERE nombre = 'Ciencia de Datos';
    SELECT id INTO v_futbol_id FROM disciplinas WHERE name = 'Fútbol';

    -- Obtener el nombre actual del equipo fusionado desde delegaciones
    SELECT nombre, carrera_ids
    INTO v_nuevo_nombre, v_new_ids
    FROM delegaciones
    WHERE disciplina_id = v_futbol_id
      AND genero = 'masculino'
      AND v_cd_id = ANY(carrera_ids)
      AND v_cp_id = ANY(carrera_ids)
    LIMIT 1;

    IF v_nuevo_nombre IS NULL THEN
        -- Fallback: construir el nombre y IDs manualmente
        v_nuevo_nombre := 'Ciencia de Datos / Ciencia Política y Gobierno';
        v_new_ids := ARRAY[v_cd_id, v_cp_id];
    END IF;

    RAISE NOTICE 'Nombre del equipo fusionado: %', v_nuevo_nombre;
    RAISE NOTICE 'carrera_ids del equipo fusionado: %', v_new_ids;

    -- Actualizar partidos donde equipo_a es Ciencia Política
    UPDATE partidos
    SET
        equipo_a      = v_nuevo_nombre,
        carrera_a_ids = v_new_ids
    WHERE disciplina_id = v_futbol_id
      AND genero = 'masculino'
      AND (
        equipo_a ILIKE '%ciencia pol%'
        OR (v_cp_id = ANY(carrera_a_ids) AND NOT (v_cd_id = ANY(carrera_a_ids)))
      );

    RAISE NOTICE 'Partidos actualizados como equipo_a: %', FOUND;

    -- Actualizar partidos donde equipo_b es Ciencia Política
    UPDATE partidos
    SET
        equipo_b      = v_nuevo_nombre,
        carrera_b_ids = v_new_ids
    WHERE disciplina_id = v_futbol_id
      AND genero = 'masculino'
      AND (
        equipo_b ILIKE '%ciencia pol%'
        OR (v_cp_id = ANY(carrera_b_ids) AND NOT (v_cd_id = ANY(carrera_b_ids)))
      );

    RAISE NOTICE 'Partidos actualizados como equipo_b: %', FOUND;

END $$;


-- ── 3. VERIFICACIÓN: confirmar que ya no queda "CIENCIA POLITICA" solo ───────

SELECT
    p.id,
    p.equipo_a,
    p.equipo_b,
    p.carrera_a_ids,
    p.carrera_b_ids,
    p.estado
FROM partidos p
JOIN disciplinas dis ON dis.id = p.disciplina_id
WHERE dis.name = 'Fútbol'
  AND p.genero = 'masculino'
ORDER BY p.fecha;
