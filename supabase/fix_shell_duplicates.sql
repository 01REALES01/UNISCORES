-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Fix: eliminar partidos "shell" de FASE DE GRUPOS duplicados del import Excel
--
-- Solo borra partidos de Fútbol/Voleibol/Baloncesto que:
--   - Están en fase = 'grupos'
--   - No tienen carrera_a_id asignada (son shells sin equipo real)
--   - equipo_a tiene un patrón de slot del Excel ("1A", "2B", "1ro. GRUPO A", etc.)
--
-- Los partidos de eliminatorias (semifinal, final, etc.) NO se tocan.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ─── PASO 1: Vista previa ────────────────────────────────────────────────────
-- Confirma que solo aparecen los shells de grupos antes de borrar.

SELECT
    p.id,
    d.name   AS disciplina,
    p.genero,
    p.equipo_a,
    p.equipo_b,
    p.fecha,
    p.fase,
    p.grupo
FROM public.partidos p
JOIN public.disciplinas d ON d.id = p.disciplina_id
WHERE
    d.name        IN ('Fútbol', 'Voleibol', 'Baloncesto')
    AND p.fase     = 'grupos'
    AND p.carrera_a_id IS NULL
    AND (
        p.equipo_a ~ '^[0-9]+[A-Za-z]$'             -- "1A", "2B", "3C"
        OR p.equipo_a ~* '^\d+(ro|do|er|to)\.'       -- "1ro. GRUPO A"
        OR p.equipo_a ~* '(GANADOR|PERDEDOR|LLAVE)'  -- slots eliminatorios mezclados
        OR length(p.equipo_a) <= 3                    -- cualquier código corto
    )
ORDER BY d.name, p.genero, p.fecha;


-- ─── PASO 2: Conteo por deporte/género ──────────────────────────────────────

SELECT
    d.name  AS disciplina,
    p.genero,
    COUNT(*) AS shells_a_borrar
FROM public.partidos p
JOIN public.disciplinas d ON d.id = p.disciplina_id
WHERE
    d.name        IN ('Fútbol', 'Voleibol', 'Baloncesto')
    AND p.fase     = 'grupos'
    AND p.carrera_a_id IS NULL
    AND (
        p.equipo_a ~ '^[0-9]+[A-Za-z]$'
        OR p.equipo_a ~* '^\d+(ro|do|er|to)\.'
        OR p.equipo_a ~* '(GANADOR|PERDEDOR|LLAVE)'
        OR length(p.equipo_a) <= 3
    )
GROUP BY d.name, p.genero
ORDER BY d.name, p.genero;


-- ─── PASO 3: DELETE ──────────────────────────────────────────────────────────
-- Descomenta y ejecuta SOLO después de revisar el PASO 1.

/*
DELETE FROM public.partidos
WHERE id IN (
    SELECT p.id
    FROM public.partidos p
    JOIN public.disciplinas d ON d.id = p.disciplina_id
    WHERE
        d.name        IN ('Fútbol', 'Voleibol', 'Baloncesto')
        AND p.fase     = 'grupos'
        AND p.carrera_a_id IS NULL
        AND (
            p.equipo_a ~ '^[0-9]+[A-Za-z]$'
            OR p.equipo_a ~* '^\d+(ro|do|er|to)\.'
            OR p.equipo_a ~* '(GANADOR|PERDEDOR|LLAVE)'
            OR length(p.equipo_a) <= 3
        )
);
*/
