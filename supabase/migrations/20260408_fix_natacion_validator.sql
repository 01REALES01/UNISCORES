-- ─────────────────────────────────────────────────────────────────────────────
-- 20260408_fix_natacion_validator.sql
-- Corrige el validador de marcador_detalle para Natación:
-- acepta tanto el formato legacy (tiempo_a/tiempo_b) como el formato
-- de carrera (tipo='carrera' + participantes[]).
-- ─────────────────────────────────────────────────────────────────────────────

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

        -- Natación: acepta formato carrera (tipo='carrera') O formato legacy (tiempo_a/tiempo_b)
        WHEN 'natación', 'natacion' THEN
            RETURN (
                (marcador_jsonb->>'tipo' = 'carrera' AND marcador_jsonb ? 'participantes')
                OR
                (marcador_jsonb ? 'tiempo_a' AND marcador_jsonb ? 'tiempo_b')
            );

        ELSE
            RETURN TRUE;
    END CASE;
END;
$$;
