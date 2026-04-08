-- =====================================================
-- BONUS SCORING: Apuestas detalladas por deporte
-- Winner (+3) + Bonus (Fútbol/Volley: +5 exacto, +2 parcial | Basket: +3 margen)
-- =====================================================

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

        -- Determinar scores según deporte
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

        FOR prediction IN SELECT * FROM public.pronosticos WHERE match_id = NEW.id LOOP
            points_awarded := 0;

            -- 1. APUESTA PRIMARIA: Ganador (+3 si acierta)
            IF prediction.winner_pick IS NOT NULL AND prediction.winner_pick = real_winner THEN
                points_awarded := 3;
            END IF;

            -- 2. APUESTA BONUS: Solo si prediction_type = 'score'
            IF prediction.prediction_type = 'score' THEN
                IF sport_name = 'Baloncesto' THEN
                    -- Margen: goles_a = 0 → cerrado (≤10), goles_a = 1 → amplio (>10)
                    DECLARE
                        actual_margin integer;
                        predicted_close boolean;
                        actual_close boolean;
                    BEGIN
                        actual_margin := ABS(score_a - score_b);
                        predicted_close := (prediction.goles_a = 0);
                        actual_close := (actual_margin <= 10);
                        IF predicted_close = actual_close THEN
                            points_awarded := points_awarded + 3;
                        END IF;
                    END;
                ELSIF prediction.goles_a IS NOT NULL AND prediction.goles_b IS NOT NULL THEN
                    -- Fútbol: marcador exacto | Voleibol: sets exactos
                    IF prediction.goles_a = score_a AND prediction.goles_b = score_b THEN
                        points_awarded := points_awarded + 5; -- Exacto
                    ELSE
                        -- Check si acertó ganador por el score (parcial)
                        DECLARE
                            pred_winner text;
                        BEGIN
                            IF prediction.goles_a > prediction.goles_b THEN pred_winner := 'A';
                            ELSIF prediction.goles_b > prediction.goles_a THEN pred_winner := 'B';
                            ELSE pred_winner := 'DRAW';
                            END IF;
                            IF pred_winner = real_winner THEN
                                points_awarded := points_awarded + 2;
                            END IF;
                        END;
                    END IF;
                END IF;
            END IF;

            UPDATE public.pronosticos SET puntos_ganados = points_awarded WHERE id = prediction.id;
            PERFORM public.update_user_gamification_metrics(prediction.user_id);
        END LOOP;

    END IF;
    RETURN NEW;
END;
$$;
