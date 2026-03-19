-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Scoring Engine Validation
-- Date: 2026-03-19
-- Description: Validates marcador JSONB structure per sport before updating partidos.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- 1. VALIDATION FUNCTION
--    Validates that marcador_jsonb has required fields for each sport.
--    Returns TRUE if valid, FALSE otherwise.

DROP FUNCTION IF EXISTS public.validate_marcador(TEXT, JSONB) CASCADE;

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
    -- Normalize sport name (lowercase, trim whitespace)
    sport_normalized := LOWER(TRIM(sport_text));

    -- Return TRUE if marcador is NULL (allow NULL state during match setup)
    IF marcador_jsonb IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Validate per sport type
    CASE sport_normalized
        -- Fútbol: requires goles_a, goles_b
        WHEN 'fútbol', 'futbol' THEN
            RETURN (
                marcador_jsonb ? 'goles_a' AND
                marcador_jsonb ? 'goles_b' AND
                (marcador_jsonb->>'goles_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'goles_b')::TEXT ~ '^\d+$'
            );

        -- Baloncesto: requires puntos_a, puntos_b
        WHEN 'baloncesto' THEN
            RETURN (
                marcador_jsonb ? 'puntos_a' AND
                marcador_jsonb ? 'puntos_b' AND
                (marcador_jsonb->>'puntos_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'puntos_b')::TEXT ~ '^\d+$'
            );

        -- Voleibol: requires sets_a, sets_b
        WHEN 'voleibol' THEN
            RETURN (
                marcador_jsonb ? 'sets_a' AND
                marcador_jsonb ? 'sets_b' AND
                (marcador_jsonb->>'sets_a')::TEXT ~ '^\d+$' AND
                (marcador_jsonb->>'sets_b')::TEXT ~ '^\d+$'
            );

        -- Tenis: requires sets_a, sets_b, games_a, games_b
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

        -- Tenis de Mesa: requires sets_a, sets_b, puntos_a, puntos_b
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

        -- Ajedrez: requires result (win_a, win_b, draw)
        WHEN 'ajedrez' THEN
            RETURN (
                marcador_jsonb ? 'resultado' AND
                (marcador_jsonb->>'resultado') IN ('victoria_a', 'victoria_b', 'empate')
            );

        -- Natación: requires tiempo_a, tiempo_b (in seconds or mm:ss format)
        WHEN 'natación', 'natacion' THEN
            RETURN (
                marcador_jsonb ? 'tiempo_a' AND
                marcador_jsonb ? 'tiempo_b'
            );

        -- Unknown sport: accept (fail-open to avoid blocking)
        ELSE
            RETURN TRUE;
    END CASE;
END;
$$;

COMMENT ON FUNCTION public.validate_marcador(TEXT, JSONB) IS
'Validates marcador_jsonb structure for each sport (Fútbol, Baloncesto, Voleibol, Tenis, Tenis de Mesa, Ajedrez, Natación).
Returns TRUE if valid, FALSE if structure is invalid. Returns TRUE for NULL marcador (setup phase).';


-- 2. TRIGGER FUNCTION
--    Validates marcador before UPDATE on partidos table.
--    Raises exception if validation fails.

DROP TRIGGER IF EXISTS trigger_validate_marcador_before_update ON public.partidos CASCADE;

DROP FUNCTION IF EXISTS public.trigger_validate_marcador_before_update() CASCADE;

CREATE OR REPLACE FUNCTION public.trigger_validate_marcador_before_update()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    sport_name TEXT;
    is_valid BOOLEAN;
BEGIN
    -- Only validate if marcador_detalle is being updated
    IF (OLD.marcador_detalle IS DISTINCT FROM NEW.marcador_detalle) THEN

        -- Get sport name from disciplinas table
        SELECT d.name INTO sport_name
        FROM public.disciplinas d
        WHERE d.id = NEW.disciplina_id;

        -- Validate marcador
        is_valid := public.validate_marcador(sport_name, NEW.marcador_detalle);

        -- Raise exception if invalid
        IF NOT is_valid THEN
            RAISE EXCEPTION 'Invalid marcador structure for sport: %. Expected required fields for this discipline.',
                COALESCE(sport_name, 'UNKNOWN');
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.trigger_validate_marcador_before_update() IS
'BEFORE UPDATE trigger on partidos. Validates marcador_detalle JSONB structure using validate_marcador().
Raises exception if validation fails, blocking the UPDATE operation.';

-- 3. CREATE TRIGGER
CREATE TRIGGER trigger_validate_marcador_before_update
    BEFORE UPDATE ON public.partidos
    FOR EACH ROW
    EXECUTE FUNCTION public.trigger_validate_marcador_before_update();

COMMENT ON TRIGGER trigger_validate_marcador_before_update ON public.partidos IS
'Validates marcador structure before partido update. Prevents invalid scoring data from being saved.';
