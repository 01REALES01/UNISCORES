-- =====================================================
-- GAMIFICATION METRICS: STREAKS & CONSISTENCY
-- =====================================================

-- 1. Añadir columnas a public_profiles si no existen
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_profiles' AND column_name = 'current_streak') THEN
        ALTER TABLE public.public_profiles ADD COLUMN current_streak integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_profiles' AND column_name = 'max_streak') THEN
        ALTER TABLE public.public_profiles ADD COLUMN max_streak integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_profiles' AND column_name = 'total_predictions') THEN
        ALTER TABLE public.public_profiles ADD COLUMN total_predictions integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'public_profiles' AND column_name = 'correct_predictions') THEN
        ALTER TABLE public.public_profiles ADD COLUMN correct_predictions integer DEFAULT 0;
    END IF;
END $$;

-- 2. Función para recalcular métricas de un usuario
CREATE OR REPLACE FUNCTION public.update_user_gamification_metrics(u_id uuid)
RETURNS void AS $$
DECLARE
    pred record;
    c_streak integer := 0;
    m_streak integer := 0;
    t_preds integer := 0;
    c_preds integer := 0;
BEGIN
    -- Obtenemos pronósticos del usuario con puntos calculados (puntos_ganados IS NOT NULL)
    -- Ordenados por fecha del partido para calcular la racha
    FOR pred IN 
        SELECT p.puntos_ganados, m.fecha
        FROM public.pronosticos p
        JOIN public.partidos m ON p.match_id = m.id
        WHERE p.user_id = u_id AND p.puntos_ganados IS NOT NULL
        ORDER BY m.fecha ASC
    LOOP
        t_preds := t_preds + 1;
        
        IF pred.puntos_ganados > 0 THEN
            c_preds := c_preds + 1;
            c_streak := c_streak + 1;
            IF c_streak > m_streak THEN m_streak := c_streak; END IF;
        ELSE
            c_streak := 0;
        END IF;
    END LOOP;

    -- Actualizar el perfil del usuario
    UPDATE public.public_profiles
    SET 
        current_streak = c_streak,
        max_streak = m_streak,
        total_predictions = t_preds,
        correct_predictions = c_preds,
        points = (SELECT COALESCE(SUM(puntos_ganados), 0) FROM public.pronosticos WHERE user_id = u_id)
    WHERE id = u_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Actualizar la función de cálculo de resultados para incluir métricas
CREATE OR REPLACE FUNCTION public.calculate_match_results()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    score_a integer := 0;
    score_b integer := 0;
    real_winner text; -- 'A', 'B', 'DRAW'
    prediction record;
    points_awarded integer;
    sport_name text;
    details jsonb;
BEGIN
    IF NEW.estado = 'finalizado' AND (OLD.estado IS DISTINCT FROM 'finalizado') THEN
        SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;
        details := NEW.marcador_detalle;
        
        -- Determinar ganador estandarizado
        IF sport_name = 'Fútbol' OR sport_name = 'Futsal' THEN
            score_a := COALESCE((details->>'goles_a')::int, 0);
            score_b := COALESCE((details->>'goles_b')::int, 0);
        ELSIF sport_name = 'Voleibol' OR sport_name = 'Tenis' OR sport_name = 'Tenis de Mesa' THEN
            score_a := COALESCE((details->>'sets_a')::int, 0);
            score_b := COALESCE((details->>'sets_b')::int, 0);
        ELSE
            -- Baloncesto y otros deportes usan total_a y total_b (con puntos_a como fallback)
            score_a := COALESCE((details->>'total_a')::int, (details->>'puntos_a')::int, 0);
            score_b := COALESCE((details->>'total_b')::int, (details->>'puntos_b')::int, 0);
        END IF;

        IF score_a > score_b THEN real_winner := 'A';
        ELSIF score_b > score_a THEN real_winner := 'B';
        ELSE real_winner := 'DRAW';
        END IF;

        FOR prediction IN SELECT * FROM public.pronosticos WHERE match_id = NEW.id LOOP
            points_awarded := 0;
            IF prediction.prediction_type = 'winner' THEN
                IF prediction.winner_pick = real_winner THEN points_awarded := 3; END IF;
            ELSIF prediction.prediction_type = 'score' THEN
                IF prediction.goles_a IS NOT NULL AND prediction.goles_b IS NOT NULL THEN
                    IF prediction.goles_a = score_a AND prediction.goles_b = score_b THEN
                        points_awarded := 5;
                    ELSE
                        DECLARE
                            pred_winner text;
                        BEGIN
                            IF prediction.goles_a > prediction.goles_b THEN pred_winner := 'A';
                            ELSIF prediction.goles_b > prediction.goles_a THEN pred_winner := 'B';
                            ELSE pred_winner := 'DRAW';
                            END IF;
                            IF pred_winner = real_winner THEN points_awarded := 2; END IF;
                        END;
                    END IF;
                END IF;
            END IF;
            
            UPDATE public.pronosticos SET puntos_ganados = points_awarded WHERE id = prediction.id;
            
            -- Recalcular métricas del usuario (puntos, rachas, consistencia)
            PERFORM public.update_user_gamification_metrics(prediction.user_id);
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$;

-- 4. Create the Trigger
DROP TRIGGER IF EXISTS trigger_calculate_match_results ON public.partidos;
CREATE TRIGGER trigger_calculate_match_results
    AFTER UPDATE ON public.partidos
    FOR EACH ROW
    WHEN (NEW.estado = 'finalizado')
    EXECUTE FUNCTION public.calculate_match_results();

-- 5. ESTADÍSTICAS DE DEPORTISTA
-- 5.1 Asegurar columnas en profiles para deportistas
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'wins') THEN
        ALTER TABLE public.profiles ADD COLUMN wins integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'losses') THEN
        ALTER TABLE public.profiles ADD COLUMN losses integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'total_score_all_time') THEN
        ALTER TABLE public.profiles ADD COLUMN total_score_all_time integer DEFAULT 0;
    END IF;
END $$;

-- 5.2 Función para actualizar estadísticas de deportista
CREATE OR REPLACE FUNCTION public.update_athlete_stats(athlete_id uuid)
RETURNS void AS $$
DECLARE
    m record;
    w_count integer := 0;
    l_count integer := 0;
    t_score integer := 0;
    score_own integer;
    is_a boolean;
    real_winner text;
    sport_name text;
    details jsonb;
    score_a integer;
    score_b integer;
BEGIN
    -- Iterar por todos los partidos finalizados donde participó el atleta (individual o en equipo)
    FOR m IN 
        SELECT p.*, d.name as d_name,
               (CASE 
                    WHEN p.athlete_a_id = athlete_id THEN true 
                    WHEN p.athlete_b_id = athlete_id THEN false
                    ELSE (SELECT j.equipo = 'equipo_a' FROM public.olympics_jugadores j WHERE j.partido_id = p.id AND j.profile_id = athlete_id LIMIT 1)
                END) as is_a_player
        FROM public.partidos p
        JOIN public.disciplinas d ON p.disciplina_id = d.id
        WHERE (p.athlete_a_id = athlete_id OR p.athlete_b_id = athlete_id OR 
               EXISTS (SELECT 1 FROM public.olympics_jugadores j WHERE j.partido_id = p.id AND j.profile_id = athlete_id))
        AND p.estado = 'finalizado'
    LOOP
        is_a := m.is_a_player;
        details := m.marcador_detalle;
        sport_name := m.d_name;

        -- DETERMINAR PUNTOS APORTADOS POR EL ATLETA EN ESTE PARTIDO
        SELECT COALESCE(SUM(
            CASE 
                WHEN e.tipo_evento = 'gol' THEN 1
                WHEN e.tipo_evento = 'punto_1' THEN 1
                WHEN e.tipo_evento = 'punto_2' THEN 2
                WHEN e.tipo_evento = 'punto_3' THEN 3
                WHEN e.tipo_evento = 'punto' THEN 1
                ELSE 0 
            END
        ), 0)
        INTO score_own
        FROM public.olympics_eventos e
        WHERE e.partido_id = m.id 
          AND e.jugador_id IN (SELECT id FROM public.olympics_jugadores j2 WHERE j2.profile_id = athlete_id);

        t_score := t_score + score_own;

        -- Winner logic (Esto sigue basándose en el marcador del equipo)
        IF sport_name = 'Fútbol' OR sport_name = 'Futsal' THEN
            score_a := COALESCE((details->>'goles_a')::int, 0);
            score_b := COALESCE((details->>'goles_b')::int, 0);
        ELSIF sport_name = 'Voleibol' OR sport_name = 'Tenis' OR sport_name = 'Tenis de Mesa' THEN
            score_a := COALESCE((details->>'sets_a')::int, 0);
            score_b := COALESCE((details->>'sets_b')::int, 0);
        ELSE
            score_a := COALESCE((details->>'total_a')::int, (details->>'puntos_a')::int, 0);
            score_b := COALESCE((details->>'total_b')::int, (details->>'puntos_b')::int, 0);
        END IF;

        IF score_a > score_b THEN real_winner := 'A';
        ELSIF score_b > score_a THEN real_winner := 'B';
        ELSE real_winner := 'DRAW';
        END IF;

        IF real_winner = (CASE WHEN is_a THEN 'A' ELSE 'B' END) THEN
            w_count := w_count + 1;
        ELSIF real_winner != 'DRAW' THEN
            l_count := l_count + 1;
        END IF;
    END LOOP;

    UPDATE public.profiles
    SET wins = w_count, losses = l_count, total_score_all_time = t_score
    WHERE id = athlete_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
