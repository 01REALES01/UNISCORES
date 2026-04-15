-- Quiniela: registrar cuándo se asignaron puntos + ranking semanal (lun 00:00 – lun 00:00, America/Bogota)

ALTER TABLE public.pronosticos
ADD COLUMN IF NOT EXISTS puntos_ganados_at timestamptz;

COMMENT ON COLUMN public.pronosticos.puntos_ganados_at IS 'Momento en que se fijaron puntos_ganados al finalizar el partido (ranking semanal).';

-- Backfill aproximado: última actualización del partido finalizado
UPDATE public.pronosticos p
SET puntos_ganados_at = m.updated_at
FROM public.partidos m
WHERE p.match_id = m.id
  AND p.puntos_ganados IS NOT NULL
  AND p.puntos_ganados > 0
  AND p.puntos_ganados_at IS NULL
  AND m.estado = 'finalizado';

UPDATE public.pronosticos
SET puntos_ganados_at = created_at
WHERE puntos_ganados IS NOT NULL
  AND puntos_ganados > 0
  AND puntos_ganados_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_pronosticos_puntos_ganados_at
  ON public.pronosticos (puntos_ganados_at)
  WHERE puntos_ganados IS NOT NULL AND puntos_ganados > 0;

-- Trigger: guardar instante de asignación de puntos
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
BEGIN
    IF NEW.estado = 'finalizado' AND (OLD.estado IS DISTINCT FROM 'finalizado') THEN
        SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;
        details := NEW.marcador_detalle;

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
                        actual_margin := ABS(score_a - score_b);
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

-- Ranking semanal (lun–lun Bogotá) + totales históricos en la misma fila
CREATE OR REPLACE FUNCTION public.quiniela_leaderboards()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    w_start timestamptz;
    w_end   timestamptz;
    rows    jsonb;
BEGIN
    w_start := (date_trunc('week', (now() AT TIME ZONE 'America/Bogota')) AT TIME ZONE 'America/Bogota');
    w_end := w_start + interval '7 days';

    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'id', q.id,
                'email', q.email,
                'display_name', q.display_name,
                'avatar_url', q.avatar_url,
                'points', q.total_points,
                'weekly_points', q.weekly_points,
                'current_streak', q.current_streak,
                'max_streak', q.max_streak,
                'total_predictions', q.total_predictions,
                'correct_predictions', q.correct_predictions
            )
            ORDER BY q.weekly_points DESC, q.total_points DESC NULLS LAST
        ),
        '[]'::jsonb
    )
    INTO rows
    FROM (
        SELECT
            pp.id,
            pp.email,
            pp.display_name,
            pp.avatar_url,
            pp.points AS total_points,
            COALESCE(s.weekly_points, 0)::bigint AS weekly_points,
            pp.current_streak,
            pp.max_streak,
            pp.total_predictions,
            pp.correct_predictions
        FROM public.public_profiles pp
        LEFT JOIN (
            SELECT user_id, SUM(puntos_ganados)::bigint AS weekly_points
            FROM public.pronosticos
            WHERE puntos_ganados IS NOT NULL
              AND puntos_ganados > 0
              AND puntos_ganados_at IS NOT NULL
              AND puntos_ganados_at >= w_start
              AND puntos_ganados_at < w_end
            GROUP BY user_id
        ) s ON s.user_id = pp.id
        ORDER BY COALESCE(s.weekly_points, 0) DESC, pp.points DESC NULLS LAST
        LIMIT 50
    ) q;

    RETURN jsonb_build_object(
        'week_start', w_start,
        'week_end', w_end,
        'ranking', rows
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.quiniela_leaderboards() TO anon;
GRANT EXECUTE ON FUNCTION public.quiniela_leaderboards() TO authenticated;
