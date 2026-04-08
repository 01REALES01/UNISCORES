-- =====================================================
-- LIMPIEZA TOTAL: ESTADÍSTICAS Y PARTIDOS DE PRUEBA
-- (VERSIÓN CORREGIDA PARA VALIDACIÓN DE MARCADORES)
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
UPDATE public.profiles
SET 
    wins = 0, 
    losses = 0, 
    total_score_all_time = 0;

-- 3. Borrar todos los partidos que ya hayan finalizado (Los de prueba)
DELETE FROM public.partidos 
WHERE estado = 'finalizado';

-- 4. Limpiar los marcadores de los partidos futuros ('programado' o 'en_vivo')
-- Utilizamos el esquema específico en ceros que requiere la base de datos por cada deporte
UPDATE public.partidos SET marcador_detalle = 
    CASE
        WHEN d.name ILIKE '%fútbol%' OR d.name ILIKE '%futbol%' THEN '{"goles_a":0, "goles_b":0}'::jsonb
        WHEN d.name ILIKE '%baloncesto%' THEN '{"puntos_a":0, "puntos_b":0}'::jsonb
        WHEN d.name ILIKE '%voleibol%' THEN '{"sets_a":0, "sets_b":0}'::jsonb
        WHEN d.name ILIKE '%tenis de mesa%' THEN '{"sets_a":0, "sets_b":0, "puntos_a":0, "puntos_b":0}'::jsonb
        WHEN d.name ILIKE '%tenis%' THEN '{"sets_a":0, "sets_b":0, "games_a":0, "games_b":0}'::jsonb
        WHEN d.name ILIKE '%ajedrez%' THEN '{"resultado":"empate"}'::jsonb
        WHEN d.name ILIKE '%nataci_n%' THEN '{"tiempo_a":"00:00", "tiempo_b":"00:00"}'::jsonb
        ELSE '{}'::jsonb
    END
FROM public.disciplinas d
WHERE public.partidos.disciplina_id = d.id;

-- 5. Borrar cualquier evento de punto, falta, sets o gol guardado en la base de datos
DELETE FROM public.olympics_eventos;
DELETE FROM public.eventos_partido;

COMMIT;
