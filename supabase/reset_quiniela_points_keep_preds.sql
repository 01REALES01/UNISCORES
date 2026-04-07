-- =====================================================
-- RESET DE PUNTUACIONES "ACIERTA Y GANA" 
-- MANTENIENDO PREDICCIONES
-- =====================================================

BEGIN;

-- 1. Quitar los puntos ganados de las predicciones existentes
-- Al ponerlos como NULL, el sistema asume que el partido aún no ha terminado
-- Por lo tanto, no sumarán puntos ni contarán para las rachas si el perfil se recalcula
UPDATE public.pronosticos
SET puntos_ganados = NULL;

-- 2. Resetear métricas estadísticas en los perfiles públicos a 0
UPDATE public.public_profiles
SET 
    points = 0,
    current_streak = 0,
    max_streak = 0,
    total_predictions = 0,
    correct_predictions = 0;

-- 3. Por consistencia, también resetear `points` en profiles principales
UPDATE public.profiles
SET 
    points = 0;

COMMIT;

-- Nota: Tus usuarios mantendrán sus selecciones (winner_pick, goles_a, goles_b).
-- Si algunas de esas predicciones corresponden a partidos futuros, 
-- cuando esos partidos terminen se calcularán y se les asignarán los puntos reales.
