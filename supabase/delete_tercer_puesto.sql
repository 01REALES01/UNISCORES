-- =========================================================================
-- ELIMINAR PARTIDOS DE TERCER PUESTO (NO PROGRAMADOS)
-- =========================================================================

BEGIN;

DELETE FROM public.partidos
WHERE 
  -- Buscamos que el partido contenga "Tercer Puesto" o "3er Puesto" en cualquier columna (fase, equipos, título...)
  (partidos::text ILIKE '%tercer puesto%' OR partidos::text ILIKE '%3er puesto%')
  AND (
    -- Condición 1: Fútbol Femenino
    (disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%fútbol%' LIMIT 1) AND genero = 'femenino')
    
    OR 
    
    -- Condición 2: Voleibol Masculino o Femenino
    (disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%voleibol%' LIMIT 1) AND genero IN ('masculino', 'femenino'))
    
    OR 
    
    -- Condición 3: Baloncesto Femenino
    (disciplina_id = (SELECT id FROM public.disciplinas WHERE name ILIKE '%baloncesto%' LIMIT 1) AND genero = 'femenino')
  );

COMMIT;
