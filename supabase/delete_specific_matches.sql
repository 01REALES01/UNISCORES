-- =========================================================================
-- ELIMINAR PARTIDOS ESPECIFICOS POR CRUCE DE EQUIPOS
-- =========================================================================

-- Usamos RETURNING al final para que la consola te muestre los nombres de los 
-- partidos que fueron destruidos y confirmemos que fueron exactamente esos 4.

DELETE FROM public.partidos
WHERE 
  -- 1. Voleibol Masculino - Ingenieria de Sistemas vs Medicina
  (
    disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%voleibol%' LIMIT 1)
    AND genero = 'masculino'
    AND (equipo_a ILIKE '%Sistemas%' OR equipo_b ILIKE '%Sistemas%')
    AND (equipo_a ILIKE '%Medicina%' OR equipo_b ILIKE '%Medicina%')
  )
  OR
  -- 2. Voleibol Femenino - Com Social / Psicologia vs Ingenieria Civil
  (
    disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%voleibol%' LIMIT 1)
    AND genero = 'femenino'
    AND (equipo_a ILIKE '%Civil%' OR equipo_b ILIKE '%Civil%')
    AND (equipo_a ILIKE '%Social%' OR equipo_b ILIKE '%Social%')
  )
  OR
  -- 3. Baloncesto Femenino - Medicina vs Ingenieria de Sistemas
  (
    disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%baloncesto%' LIMIT 1)
    AND genero = 'femenino'
    AND (equipo_a ILIKE '%Sistemas%' OR equipo_b ILIKE '%Sistemas%')
    AND (equipo_a ILIKE '%Medicina%' OR equipo_b ILIKE '%Medicina%')
  )
  OR
  -- 4. Futbol femenino - Medicina vs Ingenieria Electrica / ciencia datos
  (
    disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%fútbol%' LIMIT 1)
    AND genero = 'femenino'
    AND (equipo_a ILIKE '%Medicina%' OR equipo_b ILIKE '%Medicina%')
    AND (equipo_a ILIKE '%Electrica%' OR equipo_b ILIKE '%Electrica%')
  )
RETURNING id, genero, equipo_a AS equipo_1, equipo_b AS equipo_2;
