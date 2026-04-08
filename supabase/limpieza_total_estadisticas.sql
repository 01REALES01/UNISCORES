-- =====================================================
-- LIMPIEZA TOTAL: ESTADÍSTICAS Y PARTIDOS DE PRUEBA
-- =====================================================

BEGIN;

-- 1. Resetear contadores del Medallero de Facultades/Carreras a cero
UPDATE public.medallero
SET 
    oro = 0, 
    plata = 0, 
    bronce = 0, 
    puntos = 0;

-- 2. Resetear estadísticas de éxito de los deportistas (Perfiles) a cero
-- (Mantiene sus datos personales y asignaciones, solo resetea victorias/derrotas/puntos)
UPDATE public.profiles
SET 
    wins = 0, 
    losses = 0, 
    total_score_all_time = 0;

-- 3. Borrar todos los partidos que se haya finalizado (Los de prueba)
-- Al borrar el partido, se borran en cascada sus eventos y las predicciones asociadas
DELETE FROM public.partidos 
WHERE estado = 'finalizado';

-- 4. Limpiar los marcadores de los partidos futuros ('programado' o 'en_vivo')
-- (Por si alguien estuvo picando los botones de goles/puntos probando)
UPDATE public.partidos
SET marcador_detalle = '{}'::jsonb;

-- 5. Borrar cualquier evento de punto, falta deportiva, sets o gol guardado
DELETE FROM public.olympics_eventos;
DELETE FROM public.eventos_partido;

COMMIT;

-- ¡Tu sistema está listo y limpio para arrancar el torneo real!
