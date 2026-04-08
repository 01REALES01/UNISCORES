-- ══════════════════════════════════════════════════════════════════
-- FIX: Fusión de Ciencia Política y Gobierno → Ciencia de Datos
--      en Fútbol Masculino
-- ══════════════════════════════════════════════════════════════════
-- INSTRUCCIONES:
--   1. Corre primero el bloque DIAGNÓSTICO (solo SELECTs, nada cambia).
--   2. Verifica que los resultados son los esperados.
--   3. Corre el bloque MERGE para aplicar los cambios.
-- ══════════════════════════════════════════════════════════════════


-- ── 1. DIAGNÓSTICO ──────────────────────────────────────────────────────────

-- ¿Cuáles son los IDs de las carreras involucradas?
SELECT id, nombre
FROM carreras
WHERE nombre IN ('Ciencia Política y Gobierno', 'Ciencia de Datos');

-- ¿Qué delegaciones hay en Fútbol Masculino?
SELECT
    d.id,
    d.nombre,
    d.carrera_ids,
    array_agg(c.nombre ORDER BY c.nombre) AS carreras_miembro
FROM delegaciones d
JOIN disciplinas dis ON dis.id = d.disciplina_id
LEFT JOIN carreras c ON c.id = ANY(d.carrera_ids)
WHERE dis.name = 'Fútbol'
  AND d.genero = 'masculino'
GROUP BY d.id, d.nombre, d.carrera_ids
ORDER BY d.nombre;

-- ¿Qué partidos en Fútbol Masculino referencian a Ciencia Política?
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
  AND (
    (SELECT id FROM carreras WHERE nombre = 'Ciencia Política y Gobierno') = ANY(p.carrera_a_ids)
    OR
    (SELECT id FROM carreras WHERE nombre = 'Ciencia Política y Gobierno') = ANY(p.carrera_b_ids)
  );


-- ── 2. MERGE (correr solo después de validar el diagnóstico) ────────────────

DO $$
DECLARE
    v_cp_id       BIGINT;   -- carrera_id de Ciencia Política y Gobierno
    v_cd_id       BIGINT;   -- carrera_id de Ciencia de Datos
    v_futbol_id   BIGINT;   -- disciplina_id de Fútbol
    v_cp_deleg_id BIGINT;   -- delegación actual de Ciencia Política (Fútbol Masc)
    v_cd_deleg_id BIGINT;   -- delegación actual de Ciencia de Datos (Fútbol Masc)
    v_nuevo_nombre TEXT;
BEGIN

    -- Obtener IDs base
    SELECT id INTO v_cp_id FROM carreras WHERE nombre = 'Ciencia Política y Gobierno';
    SELECT id INTO v_cd_id FROM carreras WHERE nombre = 'Ciencia de Datos';
    SELECT id INTO v_futbol_id FROM disciplinas WHERE name = 'Fútbol';

    IF v_cp_id IS NULL THEN RAISE EXCEPTION 'No se encontró la carrera "Ciencia Política y Gobierno"'; END IF;
    IF v_cd_id IS NULL THEN RAISE EXCEPTION 'No se encontró la carrera "Ciencia de Datos"'; END IF;
    IF v_futbol_id IS NULL THEN RAISE EXCEPTION 'No se encontró la disciplina "Fútbol"'; END IF;

    -- Encontrar la delegación de Ciencia Política en Fútbol Masculino
    SELECT id INTO v_cp_deleg_id
    FROM delegaciones
    WHERE disciplina_id = v_futbol_id
      AND genero = 'masculino'
      AND v_cp_id = ANY(carrera_ids);

    -- Encontrar la delegación de Ciencia de Datos en Fútbol Masculino
    SELECT id INTO v_cd_deleg_id
    FROM delegaciones
    WHERE disciplina_id = v_futbol_id
      AND genero = 'masculino'
      AND v_cd_id = ANY(carrera_ids);

    RAISE NOTICE 'Delegación Ciencia Política (id=%): %', v_cp_deleg_id,
        (SELECT nombre FROM delegaciones WHERE id = v_cp_deleg_id);
    RAISE NOTICE 'Delegación Ciencia de Datos (id=%): %', v_cd_deleg_id,
        (SELECT nombre FROM delegaciones WHERE id = v_cd_deleg_id);

    -- ── CASO A: Ciencia de Datos ya tiene delegación → agregar Ciencia Política ──
    IF v_cd_deleg_id IS NOT NULL AND v_cp_deleg_id IS NOT NULL AND v_cd_deleg_id <> v_cp_deleg_id THEN

        -- Construir nuevo nombre
        v_nuevo_nombre := (SELECT nombre FROM delegaciones WHERE id = v_cd_deleg_id)
                          || ' / Ciencia Política y Gobierno';

        -- Agregar carrera_id de Ciencia Política al equipo de Ciencia de Datos
        UPDATE delegaciones
        SET
            carrera_ids = array_append(carrera_ids, v_cp_id),
            nombre      = v_nuevo_nombre
        WHERE id = v_cd_deleg_id;

        -- Actualizar partidos: reemplazar la referencia a la delegación de Ciencia Política
        -- por la de Ciencia de Datos (unificando los carrera_ids en cada partido)
        UPDATE partidos
        SET carrera_a_ids = array_remove(carrera_a_ids, v_cp_id) ||
                            ARRAY[v_cp_id]  -- se mantiene el id individual para histórico
        WHERE disciplina_id = v_futbol_id
          AND genero = 'masculino'
          AND v_cp_id = ANY(carrera_a_ids)
          AND v_cd_id = ANY(carrera_a_ids);  -- ya están juntos en ese partido

        UPDATE partidos
        SET carrera_b_ids = array_remove(carrera_b_ids, v_cp_id) ||
                            ARRAY[v_cp_id]
        WHERE disciplina_id = v_futbol_id
          AND genero = 'masculino'
          AND v_cp_id = ANY(carrera_b_ids)
          AND v_cd_id = ANY(carrera_b_ids);

        -- Actualizar partidos donde Ciencia Política participaba sola como equipo:
        -- cambiar equipo_a / carrera_a_ids para que apunte al equipo fusionado
        UPDATE partidos
        SET
            equipo_a      = v_nuevo_nombre,
            carrera_a_ids = (SELECT carrera_ids FROM delegaciones WHERE id = v_cd_deleg_id)
        WHERE disciplina_id = v_futbol_id
          AND genero = 'masculino'
          AND carrera_a_ids @> ARRAY[v_cp_id]
          AND NOT (carrera_a_ids @> ARRAY[v_cd_id]);

        UPDATE partidos
        SET
            equipo_b      = v_nuevo_nombre,
            carrera_b_ids = (SELECT carrera_ids FROM delegaciones WHERE id = v_cd_deleg_id)
        WHERE disciplina_id = v_futbol_id
          AND genero = 'masculino'
          AND carrera_b_ids @> ARRAY[v_cp_id]
          AND NOT (carrera_b_ids @> ARRAY[v_cd_id]);

        -- Eliminar la delegación suelta de Ciencia Política
        DELETE FROM delegaciones WHERE id = v_cp_deleg_id;

        RAISE NOTICE 'MERGE completado. Delegación % eliminada. Delegación % actualizada a "%".',
            v_cp_deleg_id, v_cd_deleg_id, v_nuevo_nombre;

    -- ── CASO B: Solo existe delegación de Ciencia Política (renombrar) ──
    ELSIF v_cp_deleg_id IS NOT NULL AND v_cd_deleg_id IS NULL THEN

        UPDATE delegaciones
        SET
            carrera_ids = array_append(carrera_ids, v_cd_id),
            nombre      = (SELECT nombre FROM delegaciones WHERE id = v_cp_deleg_id)
                          || ' / Ciencia de Datos'
        WHERE id = v_cp_deleg_id;

        RAISE NOTICE 'Solo existía delegación de Ciencia Política. Se agregó Ciencia de Datos al mismo equipo.';

    -- ── CASO C: Ciencia Política ya está dentro de la misma delegación ──
    ELSIF v_cp_deleg_id IS NOT NULL AND v_cp_deleg_id = v_cd_deleg_id THEN
        RAISE NOTICE 'Ya están en la misma delegación (id=%). No se requiere acción.', v_cp_deleg_id;

    ELSE
        RAISE WARNING 'No se encontró ninguna delegación con Ciencia Política en Fútbol Masculino.';
    END IF;

END $$;


-- ── 3. VERIFICACIÓN POST-MERGE ───────────────────────────────────────────────

-- Confirmar estado final de delegaciones en Fútbol Masculino
SELECT
    d.id,
    d.nombre,
    d.carrera_ids,
    array_agg(c.nombre ORDER BY c.nombre) AS carreras_miembro
FROM delegaciones d
JOIN disciplinas dis ON dis.id = d.disciplina_id
LEFT JOIN carreras c ON c.id = ANY(d.carrera_ids)
WHERE dis.name = 'Fútbol'
  AND d.genero = 'masculino'
GROUP BY d.id, d.nombre, d.carrera_ids
ORDER BY d.nombre;
