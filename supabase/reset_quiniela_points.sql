-- =====================================================
-- RESET DE TODO EL SISTEMA "ACIERTA Y GANA"
-- =====================================================
-- Advertencia: Esto borrará todas las predicciones de todos los usuarios
-- y reseteará los puntos y rachas a 0.

BEGIN;

-- 1. Borrar todas las predicciones (y sus puntos ganados)
DELETE FROM public.pronosticos;

-- 2. Resetear métricas en los perfiles públicos
UPDATE public.public_profiles
SET 
    points = 0,
    current_streak = 0,
    max_streak = 0,
    total_predictions = 0,
    correct_predictions = 0;

-- 3. Por consistencia, también resetear `points` en profiles si se usa en alguna migración
UPDATE public.profiles
SET 
    points = 0;

COMMIT;

-- Nota: Solo afectará las estadísticas de la Quiniela. Las estadísticas de 
-- jugadores (wins, losses) en profiles quedan intactas.
