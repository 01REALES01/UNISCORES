-- =========================================================================
-- PURGA MUNDIAL DE PARTIDOS POR EL TERCER PUESTO (TODOS LOS DEPORTES)
-- =========================================================================

-- Ya que la regla oficial es que ningún deporte tiene partidos por el 3er lugar,
-- este script buscará y destruirá sin piedad cualquier partido en la base de datos
-- que tenga esa etiqueta, para que no salgan ni en "Programación", ni en "Resultados", ni en "Quinielas".

BEGIN;

DELETE FROM public.partidos
WHERE 
  -- Busca la etiqueta tecnica de la base de datos
  fase = 'tercer_puesto'
  OR 
  -- Busca textos descriptivos en ingles/español o abreviaciones
  partidos::text ILIKE '%tercer_puesto%'
  OR partidos::text ILIKE '%tercer puesto%'
  OR partidos::text ILIKE '%3er puesto%'
  OR partidos::text ILIKE '%por el bronce%';

COMMIT;
