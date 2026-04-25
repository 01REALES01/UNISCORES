-- Quiniela: calculate_match_results() caía en el ELSE para Natación y hacía
-- (marcador_detalle->>'total_a')::int / puntos_a::int. Si existía un decimal ("0.5")
-- —a menudo por claves heredadas de otro modelo en el mismo JSON— el UPDATE fallaba al finalizar.

CREATE OR REPLACE FUNCTION public.calculate_match_results()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    score_a integer := 0;
    score_b integer := 0;
    real_winner text;
    prediction record;
    points_awarded integer;
    sport_name text;
    details jsonb;
    sport_lower text;
BEGIN
    IF NEW.estado = 'finalizado' AND (OLD.estado IS DISTINCT FROM 'finalizado') THEN
        SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;
        details := NEW.marcador_detalle;
        sport_lower := translate(lower(trim(coalesce(sport_name, ''))), 'áéíóúüñ', 'aeiouun');

        IF sport_name = 'Fútbol' OR sport_name = 'Futsal' THEN
            score_a := coalesce((details->>'goles_a')::int, 0);
            score_b := coalesce((details->>'goles_b')::int, 0);
        ELSIF sport_name = 'Voleibol' OR sport_name = 'Tenis' OR sport_name = 'Tenis de Mesa' THEN
            score_a := coalesce((details->>'sets_a')::int, 0);
            score_b := coalesce((details->>'sets_b')::int, 0);
        ELSIF sport_lower LIKE '%natacion%'
              OR sport_lower LIKE '%ajedrez%'
              OR coalesce(details->>'tipo', '') = 'carrera' THEN
            score_a := 0;
            score_b := 0;
        ELSE
            score_a := coalesce((details->>'total_a')::int, (details->>'puntos_a')::int, 0);
            score_b := coalesce((details->>'total_b')::int, (details->>'puntos_b')::int, 0);
        END IF;

        IF score_a > score_b THEN real_winner := 'A';
        ELSIF score_b > score_a THEN real_winner := 'B';
        ELSE real_winner := 'DRAW';
        END IF;

        FOR prediction IN SELECT * FROM public.pronosticos WHERE match_id = NEW.id LOOP
            points_awarded := 0;

            IF prediction.winner_pick IS NOT NULL AND prediction.winner_pick = real_winner THEN
                points_awarded := 3;
            END IF;

            IF prediction.prediction_type = 'score' THEN
                IF sport_name = 'Baloncesto' THEN
                    DECLARE
                        actual_margin integer;
                        predicted_close boolean;
                        actual_close boolean;
                    BEGIN
                        actual_margin := abs(score_a - score_b);
                        predicted_close := (prediction.goles_a = 0);
                        actual_close := (actual_margin <= 10);
                        IF predicted_close = actual_close THEN
                            points_awarded := points_awarded + 3;
                        END IF;
                    END;
                ELSIF prediction.goles_a IS NOT NULL AND prediction.goles_b IS NOT NULL THEN
                    IF prediction.goles_a = score_a AND prediction.goles_b = score_b THEN
                        points_awarded := points_awarded + 5;
                    ELSE
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

            UPDATE public.pronosticos
            SET puntos_ganados = points_awarded,
                puntos_ganados_at = clock_timestamp()
            WHERE id = prediction.id;

            PERFORM public.update_user_gamification_metrics(prediction.user_id);
        END LOOP;

    END IF;
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.calculate_match_results() IS
'Quiniela al pasar partido a finalizado: scores por deporte. Natación / tipo carrera / ajedrez no usan total_a/puntos_a (evita cast int sobre decimales heredados).';
