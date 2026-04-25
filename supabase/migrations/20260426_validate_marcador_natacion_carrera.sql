-- Natación: el modelo en app es carrera con `participantes[]`, no tiempo_a/tiempo_b.
-- Ampliar validate_marcador para aceptar ambos formatos y no bloquear RaceControl / edición.

CREATE OR REPLACE FUNCTION public.validate_marcador(
    sport_text TEXT,
    marcador_jsonb JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
    sport_normalized TEXT;
BEGIN
    sport_normalized := LOWER(TRIM(sport_text));

    IF marcador_jsonb IS NULL THEN
        RETURN TRUE;
    END IF;

    CASE sport_normalized
        WHEN 'fútbol', 'futbol' THEN
            RETURN (
                marcador_jsonb ? 'goles_a' AND
                marcador_jsonb ? 'goles_b' AND
                (marcador_jsonb->>'goles_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'goles_b')::TEXT ~ '^\d+$'
            );

        WHEN 'baloncesto' THEN
            RETURN (
                marcador_jsonb ? 'puntos_a' AND
                marcador_jsonb ? 'puntos_b' AND
                (marcador_jsonb->>'puntos_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'puntos_b')::TEXT ~ '^\d+$'
            );

        WHEN 'voleibol' THEN
            RETURN (
                marcador_jsonb ? 'sets_a' AND
                marcador_jsonb ? 'sets_b' AND
                (marcador_jsonb->>'sets_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'sets_b')::TEXT ~ '^\d+$'
            );

        WHEN 'tenis' THEN
            RETURN (
                marcador_jsonb ? 'sets_a' AND
                marcador_jsonb ? 'sets_b' AND
                marcador_jsonb ? 'games_a' AND
                marcador_jsonb ? 'games_b' AND
                (marcador_jsonb->>'sets_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'sets_b')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'games_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'games_b')::TEXT ~ '^\d+$'
            );

        WHEN 'tenis de mesa' THEN
            RETURN (
                marcador_jsonb ? 'sets_a' AND
                marcador_jsonb ? 'sets_b' AND
                marcador_jsonb ? 'puntos_a' AND
                marcador_jsonb ? 'puntos_b' AND
                (marcador_jsonb->>'sets_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'sets_b')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'puntos_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'puntos_b')::TEXT ~ '^\d+$'
            );

        WHEN 'ajedrez' THEN
            RETURN (
                marcador_jsonb ? 'resultado' AND
                (marcador_jsonb->>'resultado') IN ('victoria_a', 'victoria_b', 'empate')
            );

        -- Natación: modelo carrera (participantes[]) o legado tiempo_a / tiempo_b
        WHEN 'natación', 'natacion' THEN
            RETURN (
                (
                    marcador_jsonb ? 'participantes'
                    AND jsonb_typeof(marcador_jsonb->'participantes') = 'array'
                )
                OR
                (
                    marcador_jsonb ? 'tiempo_a'
                    AND marcador_jsonb ? 'tiempo_b'
                )
            );

        ELSE
            RETURN TRUE;
    END CASE;
END;
$$;

COMMENT ON FUNCTION public.validate_marcador(TEXT, JSONB) IS
'Valida marcador_detalle por deporte. Natación: acepta tipo carrera con array participantes o legado tiempo_a/tiempo_b.';
