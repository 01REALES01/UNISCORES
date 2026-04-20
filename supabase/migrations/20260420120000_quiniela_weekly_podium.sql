-- Acierta y gana: guardar top 3 por semana cerrada (Bogotá) para mostrar "quién ganó" al reiniciar la semana
-- Mismo criterio que public.quiniela_leaderboards (puntos_ganados_at en [week_start, week_end))

CREATE TABLE IF NOT EXISTS public.quiniela_weekly_podium (
    week_start timestamptz NOT NULL,
    week_end   timestamptz NOT NULL,
    podium     jsonb NOT NULL DEFAULT '[]'::jsonb,
    computed_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (week_start)
);

COMMENT ON TABLE public.quiniela_weekly_podium IS
    'Podio fijado (top 3) al cerrar cada semana; week_* alineado con quiniela_leaderboards (America/Bogota).';

CREATE INDEX IF NOT EXISTS quiniela_weekly_podium_computed_at_idx
    ON public.quiniela_weekly_podium (computed_at DESC);

ALTER TABLE public.quiniela_weekly_podium ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quiniela_weekly_podium_read"
    ON public.quiniela_weekly_podium
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Inicio de semana ISO (lunes 00:00) en eje Bogotá, coherente con quiniela_leaderboards
CREATE OR REPLACE FUNCTION public._quiniela_bogota_week_start(from_ts timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT (date_trunc('week', (from_ts AT TIME ZONE 'America/Bogota')) AT TIME ZONE 'America/Bogota');
$$;

-- Top 3 de una semana dada
CREATE OR REPLACE FUNCTION public._quiniela_week_top3(p_week_start timestamptz)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH w AS (
        SELECT
            p_week_start AS w_start,
            p_week_start + interval '7 days' AS w_end
    ),
    sc AS (
        SELECT
            p.user_id,
            SUM(p.puntos_ganados)::bigint AS weekly_points
        FROM public.pronosticos p, w
        WHERE p.puntos_ganados IS NOT NULL
          AND p.puntos_ganados > 0
          AND p.puntos_ganados_at IS NOT NULL
          AND p.puntos_ganados_at >= w.w_start
          AND p.puntos_ganados_at < w.w_end
        GROUP BY p.user_id
    ),
    rnk AS (
        SELECT
            sc.user_id,
            sc.weekly_points::int,
            COALESCE(pp.display_name, 'Jugador') AS display_name,
            pp.avatar_url,
            COALESCE(pp.points, 0)::int AS total_points,
            ROW_NUMBER() OVER (
                ORDER BY sc.weekly_points DESC, COALESCE(pp.points, 0) DESC
            ) AS place
        FROM sc
        LEFT JOIN public.public_profiles pp ON pp.id = sc.user_id
    )
    SELECT COALESCE(
        (SELECT jsonb_agg(
            jsonb_build_object(
                'place', r.place,
                'id', r.user_id,
                'display_name', r.display_name,
                'avatar_url', r.avatar_url,
                'weekly_points', r.weekly_points,
                'points', r.total_points
            )
            ORDER BY r.place
        )
        FROM rnk r
        WHERE r.place <= 3),
        '[]'::jsonb
    );
$$;

-- Rellena filas para semanas ya cerradas que aún no tengan podio
CREATE OR REPLACE FUNCTION public.quiniela_snapshot_completed_weeks()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    cur_start  timestamptz;
    wk         timestamptz; -- inicio de semana de cada fila
    w_end      timestamptz;
    p_json     jsonb;
    n          int := 0;
BEGIN
    cur_start := (date_trunc('week', (now() AT TIME ZONE 'America/Bogota')) AT TIME ZONE 'America/Bogota');

    FOR wk IN
        SELECT DISTINCT
            (date_trunc('week', (p.puntos_ganados_at AT TIME ZONE 'America/Bogota')) AT TIME ZONE 'America/Bogota')::timestamptz
        FROM public.pronosticos p
        WHERE p.puntos_ganados IS NOT NULL
          AND p.puntos_ganados > 0
          AND p.puntos_ganados_at IS NOT NULL
    LOOP
        IF wk >= cur_start THEN
            CONTINUE;
        END IF;
        IF EXISTS (SELECT 1 FROM public.quiniela_weekly_podium z WHERE z.week_start = wk) THEN
            CONTINUE;
        END IF;

        w_end := wk + interval '7 days';
        p_json := public._quiniela_week_top3(wk);
        IF p_json IS NOT NULL AND jsonb_array_length(p_json) > 0 THEN
            INSERT INTO public.quiniela_weekly_podium (week_start, week_end, podium)
            VALUES (wk, w_end, p_json);
            n := n + 1;
        END IF;
    END LOOP;
    RETURN n;
END;
$$;

-- Últimas N semanas con podio fijado (más reciente primero)
CREATE OR REPLACE FUNCTION public.quiniela_podium_history(p_limit int DEFAULT 8)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    res jsonb;
    lim int := GREATEST(1, LEAST(52, p_limit));
BEGIN
    SELECT COALESCE(
        jsonb_agg(week_block ORDER BY (week_block->>'week_start')::timestamptz DESC),
        '[]'::jsonb
    )
    INTO res
    FROM (
        SELECT
            jsonb_build_object(
                'week_start', t.week_start,
                'week_end', t.week_end,
                'podium', t.podium
            ) AS week_block
        FROM public.quiniela_weekly_podium t
        ORDER BY t.week_start DESC
        LIMIT lim
    ) sub;
    RETURN COALESCE(res, '[]'::jsonb);
END;
$$;

GRANT SELECT ON public.quiniela_weekly_podium TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiniela_snapshot_completed_weeks() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.quiniela_podium_history(int) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public._quiniela_bogota_week_start(timestamptz) TO anon, authenticated;
