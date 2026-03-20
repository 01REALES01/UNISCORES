-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Top Scorers View & Career Stats View
-- Date: 2026-03-20
-- Description:
--   1. Creates view_top_scorers: aggregated scoring per player per sport
--   2. Creates view_career_stats: win/loss/medal stats per career
--   Both views are read-only and used by public leaderboard pages.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW 1: Top Scorers per Sport
-- ═══════════════════════════════════════════════════════════════════════════════
-- Aggregates olympics_eventos to show who scored the most goals/points per sport.
-- Joins with jugadores for player info and disciplinas for sport name.

DROP VIEW IF EXISTS public.view_top_scorers;

CREATE VIEW public.view_top_scorers AS
SELECT
    j.id AS jugador_id,
    j.nombre,
    j.numero,
    j.profile_id,
    d.name AS disciplina,
    COUNT(*) FILTER (WHERE e.tipo_evento = 'gol') AS goles,
    SUM(
        CASE
            WHEN e.tipo_evento = 'gol' THEN 1
            WHEN e.tipo_evento = 'punto' THEN 1
            WHEN e.tipo_evento = 'punto_1' THEN 1
            WHEN e.tipo_evento = 'punto_2' THEN 2
            WHEN e.tipo_evento = 'punto_3' THEN 3
            ELSE 0
        END
    ) AS puntos_totales,
    COUNT(DISTINCT e.partido_id) AS partidos_jugados,
    -- Best single-match performance
    MAX(sub.puntos_partido) AS mejor_partido
FROM public.olympics_eventos e
JOIN public.jugadores j ON j.id = e.jugador_id
JOIN public.partidos p ON p.id = e.partido_id
JOIN public.disciplinas d ON d.id = p.disciplina_id
LEFT JOIN LATERAL (
    SELECT
        SUM(
            CASE
                WHEN e2.tipo_evento = 'gol' THEN 1
                WHEN e2.tipo_evento = 'punto' THEN 1
                WHEN e2.tipo_evento = 'punto_1' THEN 1
                WHEN e2.tipo_evento = 'punto_2' THEN 2
                WHEN e2.tipo_evento = 'punto_3' THEN 3
                ELSE 0
            END
        ) AS puntos_partido
    FROM public.olympics_eventos e2
    WHERE e2.jugador_id = j.id AND e2.partido_id = e.partido_id
    AND e2.tipo_evento IN ('gol', 'punto', 'punto_1', 'punto_2', 'punto_3')
) sub ON true
WHERE e.tipo_evento IN ('gol', 'punto', 'punto_1', 'punto_2', 'punto_3')
AND p.estado = 'finalizado'
GROUP BY j.id, j.nombre, j.numero, j.profile_id, d.name
HAVING SUM(
    CASE
        WHEN e.tipo_evento = 'gol' THEN 1
        WHEN e.tipo_evento = 'punto' THEN 1
        WHEN e.tipo_evento = 'punto_1' THEN 1
        WHEN e.tipo_evento = 'punto_2' THEN 2
        WHEN e.tipo_evento = 'punto_3' THEN 3
        ELSE 0
    END
) > 0
ORDER BY puntos_totales DESC;

-- Grant read access (RLS not applicable to views, they inherit from base tables)
GRANT SELECT ON public.view_top_scorers TO authenticated, anon;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VIEW 2: Career Stats (for /carrera/[id] enhancement)
-- ═══════════════════════════════════════════════════════════════════════════════

DROP VIEW IF EXISTS public.view_career_stats;

CREATE VIEW public.view_career_stats AS
SELECT
    c.id AS carrera_id,
    c.nombre AS carrera_nombre,
    c.escudo_url,
    COUNT(DISTINCT p.id) AS total_partidos,
    COUNT(DISTINCT p.id) FILTER (
        WHERE (
            (p.carrera_a_id = c.id AND (
                COALESCE((p.marcador_detalle->>'goles_a')::int, (p.marcador_detalle->>'sets_a')::int, (p.marcador_detalle->>'total_a')::int, 0)
                > COALESCE((p.marcador_detalle->>'goles_b')::int, (p.marcador_detalle->>'sets_b')::int, (p.marcador_detalle->>'total_b')::int, 0)
            ))
            OR
            (p.carrera_b_id = c.id AND (
                COALESCE((p.marcador_detalle->>'goles_b')::int, (p.marcador_detalle->>'sets_b')::int, (p.marcador_detalle->>'total_b')::int, 0)
                > COALESCE((p.marcador_detalle->>'goles_a')::int, (p.marcador_detalle->>'sets_a')::int, (p.marcador_detalle->>'total_a')::int, 0)
            ))
        )
    ) AS victorias,
    COUNT(DISTINCT p.id) FILTER (
        WHERE (
            (p.carrera_a_id = c.id AND (
                COALESCE((p.marcador_detalle->>'goles_a')::int, (p.marcador_detalle->>'sets_a')::int, (p.marcador_detalle->>'total_a')::int, 0)
                < COALESCE((p.marcador_detalle->>'goles_b')::int, (p.marcador_detalle->>'sets_b')::int, (p.marcador_detalle->>'total_b')::int, 0)
            ))
            OR
            (p.carrera_b_id = c.id AND (
                COALESCE((p.marcador_detalle->>'goles_b')::int, (p.marcador_detalle->>'sets_b')::int, (p.marcador_detalle->>'total_b')::int, 0)
                < COALESCE((p.marcador_detalle->>'goles_a')::int, (p.marcador_detalle->>'sets_a')::int, (p.marcador_detalle->>'total_a')::int, 0)
            ))
        )
    ) AS derrotas
FROM public.carreras c
LEFT JOIN public.partidos p
    ON (p.carrera_a_id = c.id OR p.carrera_b_id = c.id)
    AND p.estado = 'finalizado'
GROUP BY c.id, c.nombre, c.escudo_url
ORDER BY victorias DESC, total_partidos DESC;

GRANT SELECT ON public.view_career_stats TO authenticated, anon;

-- Notify PostgREST to pick up new views
NOTIFY pgrst, 'reload schema';
