-- Al finalizar un partido, trigger_sync_athlete_stats → update_athlete_stats(profile_id)
-- por cada vínculo (olympics_jugadores / athlete_a/b). Esa función tenía el mismo ELSE
-- que calculate_match_results: (marcador_detalle->>'puntos_a')::int
-- Pruebas con muchos nadadores = muchas llamadas = mismo error "0.5".
-- Natación / tipo carrera no usan marcador A/B; no se deben castear esos campos.

CREATE OR REPLACE FUNCTION public.update_athlete_stats(athlete_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    m record;
    w_count integer := 0;
    l_count integer := 0;
    t_score integer := 0;
    score_own integer;
    is_a boolean;
    real_winner text;
    sport_name text;
    sport_lower text;
    details jsonb;
    score_a integer;
    score_b integer;
BEGIN
    FOR m IN
        SELECT p.*, d.name as d_name,
               (CASE
                    WHEN p.athlete_a_id = athlete_id THEN true
                    WHEN p.athlete_b_id = athlete_id THEN false
                    ELSE (SELECT rp.equipo_a_or_b = 'equipo_a'
                          FROM public.roster_partido rp
                          JOIN public.jugadores j ON rp.jugador_id = j.id
                          WHERE rp.partido_id = p.id AND j.profile_id = athlete_id LIMIT 1)
                END) as is_a_player
        FROM public.partidos p
        JOIN public.disciplinas d ON p.disciplina_id = d.id
        WHERE (p.athlete_a_id = athlete_id OR p.athlete_b_id = athlete_id OR
               EXISTS (SELECT 1 FROM public.roster_partido rp JOIN public.jugadores j ON rp.jugador_id = j.id WHERE rp.partido_id = p.id AND j.profile_id = athlete_id))
        AND p.estado = 'finalizado'
    LOOP
        is_a := m.is_a_player;
        details := m.marcador_detalle;
        sport_name := m.d_name;
        sport_lower := translate(lower(trim(coalesce(sport_name, ''))), 'áéíóúüñ', 'aeiouun');

        SELECT coalesce(sum(
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
          AND e.jugador_id IN (SELECT id FROM public.jugadores j2 WHERE j2.profile_id = athlete_id);

        t_score := t_score + score_own;

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
$$;

COMMENT ON FUNCTION public.update_athlete_stats(uuid) IS
'Recalcula wins/losses/eventos para un perfil. Natación / tipo carrera / ajedrez: no usa puntos_a/total_a (evita cast int sobre decimales en JSON).';
