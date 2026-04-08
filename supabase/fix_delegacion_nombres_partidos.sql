-- ══════════════════════════════════════════════════════════════════
-- FIX: Sincronizar delegacion_a / delegacion_b en partidos
--      con el nombre actual de delegaciones
--
-- La clasificación lee de estas columnas de texto (no de equipo_a/b),
-- por eso los cambios en delegaciones no se reflejaban.
-- ══════════════════════════════════════════════════════════════════

-- ── 1. DIAGNÓSTICO: ver desajustes actuales ──────────────────────────────────
-- Muestra partidos donde delegacion_a o delegacion_b no coincide
-- con equipo_a / equipo_b (posibles nombres desactualizados)

SELECT
    p.id,
    p.equipo_a,
    p.delegacion_a,
    p.equipo_b,
    p.delegacion_b,
    dis.name AS deporte,
    p.genero,
    p.estado
FROM partidos p
JOIN disciplinas dis ON dis.id = p.disciplina_id
WHERE (p.delegacion_a IS DISTINCT FROM p.equipo_a
    OR p.delegacion_b IS DISTINCT FROM p.equipo_b)
  AND (p.delegacion_a IS NOT NULL OR p.delegacion_b IS NOT NULL)
ORDER BY dis.name, p.genero, p.id;


-- ── 2. FIX GENERAL: sincronizar delegacion_a/b con equipo_a/b ────────────────
-- Aplica para TODOS los deportes, no solo fútbol.
-- Si en el futuro cambias un nombre en delegaciones y en equipo_a/b,
-- basta con volver a correr este bloque.

UPDATE partidos
SET
    delegacion_a = equipo_a,
    delegacion_b = equipo_b
WHERE delegacion_a IS DISTINCT FROM equipo_a
   OR delegacion_b IS DISTINCT FROM equipo_b;


-- ── 3. VERIFICACIÓN ──────────────────────────────────────────────────────────

-- Confirmar que ya no hay desajustes
SELECT COUNT(*) AS partidos_con_desajuste
FROM partidos
WHERE delegacion_a IS DISTINCT FROM equipo_a
   OR delegacion_b IS DISTINCT FROM equipo_b;

-- Ver partidos de Fútbol Masculino para confirmar el nombre fusionado
SELECT
    p.id,
    p.equipo_a,
    p.delegacion_a,
    p.equipo_b,
    p.delegacion_b,
    p.estado
FROM partidos p
JOIN disciplinas dis ON dis.id = p.disciplina_id
WHERE dis.name = 'Fútbol'
  AND p.genero = 'masculino'
ORDER BY p.fecha;
