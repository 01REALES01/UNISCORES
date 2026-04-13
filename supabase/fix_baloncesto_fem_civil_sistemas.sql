-- ══════════════════════════════════════════════════════════════════
-- FIX: Fusión de Ingeniería de Sistemas → Ingeniería Civil
--      en Baloncesto Femenino
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
WHERE nombre IN ('Ingeniería Civil', 'Ingeniería de Sistemas');

-- ¿Qué delegaciones hay en Baloncesto Femenino?
SELECT
    d.id,
    d.nombre,
    d.carrera_ids,
    array_agg(c.nombre ORDER BY c.nombre) AS carreras_miembro
FROM delegaciones d
JOIN disciplinas dis ON dis.id = d.disciplina_id
LEFT JOIN carreras c ON c.id = ANY(d.carrera_ids)
WHERE dis.name = 'Baloncesto'
  AND d.genero = 'femenino'
GROUP BY d.id, d.nombre, d.carrera_ids
ORDER BY d.nombre;

-- ¿Qué partidos en Baloncesto Femenino referencian a Ingeniería de Sistemas?
SELECT
    p.id,
    p.equipo_a,
    p.equipo_b,
    p.carrera_a_ids,
    p.carrera_b_ids,
    p.estado
FROM partidos p
JOIN disciplinas dis ON dis.id = p.disciplina_id
WHERE dis.name = 'Baloncesto'
  AND p.genero = 'femenino'
  AND (
    (SELECT id FROM carreras WHERE nombre = 'Ingeniería de Sistemas') = ANY(p.carrera_a_ids)
    OR
    (SELECT id FROM carreras WHERE nombre = 'Ingeniería de Sistemas') = ANY(p.carrera_b_ids)
  );


-- ── 2. MERGE (correr solo después de validar el diagnóstico) ────────────────

DO $$
DECLARE
    v_civil_id       BIGINT;   -- carrera_id de Ingeniería Civil
    v_sistemas_id    BIGINT;   -- carrera_id de Ingeniería de Sistemas
    v_baloncesto_id  BIGINT;   -- disciplina_id de Baloncesto
    v_civil_deleg_id    BIGINT;   -- delegación actual de Civil (Baloncesto Fem)
    v_sistemas_deleg_id BIGINT;   -- delegación actual de Sistemas (Baloncesto Fem)
    v_nuevo_nombre   TEXT := 'ING. CIVIL/SISTEMAS';
BEGIN

    -- Obtener IDs base
    SELECT id INTO v_civil_id    FROM carreras WHERE nombre = 'Ingeniería Civil';
    SELECT id INTO v_sistemas_id FROM carreras WHERE nombre = 'Ingeniería de Sistemas';
    SELECT id INTO v_baloncesto_id FROM disciplinas WHERE name = 'Baloncesto';

    IF v_civil_id    IS NULL THEN RAISE EXCEPTION 'No se encontró la carrera "Ingeniería Civil"'; END IF;
    IF v_sistemas_id IS NULL THEN RAISE EXCEPTION 'No se encontró la carrera "Ingeniería de Sistemas"'; END IF;
    IF v_baloncesto_id IS NULL THEN RAISE EXCEPTION 'No se encontró la disciplina "Baloncesto"'; END IF;

    -- Encontrar la delegación de Civil en Baloncesto Femenino
    SELECT id INTO v_civil_deleg_id
    FROM delegaciones
    WHERE disciplina_id = v_baloncesto_id
      AND genero = 'femenino'
      AND v_civil_id = ANY(carrera_ids);

    -- Encontrar la delegación de Sistemas en Baloncesto Femenino
    SELECT id INTO v_sistemas_deleg_id
    FROM delegaciones
    WHERE disciplina_id = v_baloncesto_id
      AND genero = 'femenino'
      AND v_sistemas_id = ANY(carrera_ids);

    RAISE NOTICE 'Delegación Civil (id=%): %', v_civil_deleg_id,
        (SELECT nombre FROM delegaciones WHERE id = v_civil_deleg_id);
    RAISE NOTICE 'Delegación Sistemas (id=%): %', v_sistemas_deleg_id,
        (SELECT nombre FROM delegaciones WHERE id = v_sistemas_deleg_id);

    -- ── CASO A: Ambas tienen delegaciones separadas → fusionar Sistemas en Civil ──
    IF v_civil_deleg_id IS NOT NULL AND v_sistemas_deleg_id IS NOT NULL AND v_civil_deleg_id <> v_sistemas_deleg_id THEN

        -- Agregar carrera_id de Sistemas al equipo de Civil y renombrar
        UPDATE delegaciones
        SET
            carrera_ids = array_append(carrera_ids, v_sistemas_id),
            nombre      = v_nuevo_nombre
        WHERE id = v_civil_deleg_id;

        -- Actualizar partidos donde Sistemas aparecía solo como equipo:
        -- cambiar equipo_a / carrera_a_ids para que apunte al equipo fusionado
        UPDATE partidos
        SET
            equipo_a      = v_nuevo_nombre,
            carrera_a_ids = (SELECT carrera_ids FROM delegaciones WHERE id = v_civil_deleg_id)
        WHERE disciplina_id = v_baloncesto_id
          AND genero = 'femenino'
          AND carrera_a_ids @> ARRAY[v_sistemas_id]
          AND NOT (carrera_a_ids @> ARRAY[v_civil_id]);

        UPDATE partidos
        SET
            equipo_b      = v_nuevo_nombre,
            carrera_b_ids = (SELECT carrera_ids FROM delegaciones WHERE id = v_civil_deleg_id)
        WHERE disciplina_id = v_baloncesto_id
          AND genero = 'femenino'
          AND carrera_b_ids @> ARRAY[v_sistemas_id]
          AND NOT (carrera_b_ids @> ARRAY[v_civil_id]);

        -- Actualizar partidos donde Civil ya aparecía (renombrar equipo)
        UPDATE partidos
        SET equipo_a = v_nuevo_nombre
        WHERE disciplina_id = v_baloncesto_id
          AND genero = 'femenino'
          AND carrera_a_ids @> ARRAY[v_civil_id]
          AND equipo_a <> v_nuevo_nombre;

        UPDATE partidos
        SET equipo_b = v_nuevo_nombre
        WHERE disciplina_id = v_baloncesto_id
          AND genero = 'femenino'
          AND carrera_b_ids @> ARRAY[v_civil_id]
          AND equipo_b <> v_nuevo_nombre;

        -- Eliminar la delegación suelta de Sistemas
        DELETE FROM delegaciones WHERE id = v_sistemas_deleg_id;

        RAISE NOTICE 'MERGE completado. Delegación Sistemas (%) eliminada. Delegación Civil (%) actualizada a "%".',
            v_sistemas_deleg_id, v_civil_deleg_id, v_nuevo_nombre;

    -- ── CASO B: Solo existe delegación de Civil → agregar Sistemas ──
    ELSIF v_civil_deleg_id IS NOT NULL AND v_sistemas_deleg_id IS NULL THEN

        UPDATE delegaciones
        SET
            carrera_ids = array_append(carrera_ids, v_sistemas_id),
            nombre      = v_nuevo_nombre
        WHERE id = v_civil_deleg_id;

        -- Renombrar partidos que referencian Civil
        UPDATE partidos
        SET equipo_a = v_nuevo_nombre
        WHERE disciplina_id = v_baloncesto_id
          AND genero = 'femenino'
          AND carrera_a_ids @> ARRAY[v_civil_id]
          AND equipo_a <> v_nuevo_nombre;

        UPDATE partidos
        SET equipo_b = v_nuevo_nombre
        WHERE disciplina_id = v_baloncesto_id
          AND genero = 'femenino'
          AND carrera_b_ids @> ARRAY[v_civil_id]
          AND equipo_b <> v_nuevo_nombre;

        RAISE NOTICE 'Solo existía delegación de Civil. Se agregó Sistemas y se renombró a "%".', v_nuevo_nombre;

    -- ── CASO C: Ya están en la misma delegación ──
    ELSIF v_civil_deleg_id IS NOT NULL AND v_civil_deleg_id = v_sistemas_deleg_id THEN
        RAISE NOTICE 'Ya están en la misma delegación (id=%). No se requiere acción.', v_civil_deleg_id;

    ELSE
        RAISE WARNING 'No se encontró ninguna delegación de Civil ni Sistemas en Baloncesto Femenino.';
    END IF;

END $$;


-- ── 3. VERIFICACIÓN POST-MERGE ───────────────────────────────────────────────

-- Confirmar estado final de delegaciones en Baloncesto Femenino
SELECT
    d.id,
    d.nombre,
    d.carrera_ids,
    array_agg(c.nombre ORDER BY c.nombre) AS carreras_miembro
FROM delegaciones d
JOIN disciplinas dis ON dis.id = d.disciplina_id
LEFT JOIN carreras c ON c.id = ANY(d.carrera_ids)
WHERE dis.name = 'Baloncesto'
  AND d.genero = 'femenino'
GROUP BY d.id, d.nombre, d.carrera_ids
ORDER BY d.nombre;

-- Confirmar partidos actualizados
SELECT
    p.id,
    p.equipo_a,
    p.equipo_b,
    p.carrera_a_ids,
    p.carrera_b_ids,
    p.estado
FROM partidos p
JOIN disciplinas dis ON dis.id = p.disciplina_id
WHERE dis.name = 'Baloncesto'
  AND p.genero = 'femenino'
ORDER BY p.fecha;
