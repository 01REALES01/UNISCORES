-- SCRIPT DE RE-SINCRONIZACIÓN DE ESTADÍSTICAS
-- Ejecuta esto una sola vez para corregir todos los ceros actuales.

DO $$
DECLARE
    athlete record;
BEGIN
    -- Recalcular métricas de racha para todos los usuarios
    FOR athlete IN SELECT id FROM public.public_profiles LOOP
        PERFORM public.update_user_gamification_metrics(athlete.id);
    END LOOP;

    -- Recalcular victorias/derrotas/puntos para todos los deportistas
    FOR athlete IN SELECT id FROM public.profiles LOOP
        PERFORM public.update_athlete_stats(athlete.id);
    END LOOP;
END $$;
