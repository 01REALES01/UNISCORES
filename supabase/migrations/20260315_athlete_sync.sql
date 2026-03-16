-- Migration: Athlete Stats Synchronization
-- Description: Automatically update athlete profiles when matches are finalized.

-- 1. Add profile_id to olympics_jugadores if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'olympics_jugadores' AND column_name = 'profile_id') THEN
        ALTER TABLE public.olympics_jugadores ADD COLUMN profile_id UUID REFERENCES public.profiles(id);
    END IF;
END $$;

-- 2. Enhanced function to update athlete stats (Individual & Team)
CREATE OR REPLACE FUNCTION public.sync_athlete_match_stats()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    athlete_rec record;
    stat_rec record;
BEGIN
    -- Only run when status changes to 'finalizado'
    IF NEW.estado = 'finalizado' AND (OLD.estado IS DISTINCT FROM 'finalizado') THEN
        
        -- A. UPDATE INDIVIDUAL ATHLETES (if linked directly in partidos)
        IF NEW.athlete_a_id IS NOT NULL THEN
            PERFORM public.update_athlete_stats(NEW.athlete_a_id);
        END IF;
        
        IF NEW.athlete_b_id IS NOT NULL THEN
            PERFORM public.update_athlete_stats(NEW.athlete_b_id);
        END IF;

        -- B. UPDATE TEAM PLAYERS (linked via olympics_jugadores)
        FOR athlete_rec IN 
            SELECT DISTINCT profile_id 
            FROM public.olympics_jugadores 
            WHERE partido_id = NEW.id AND profile_id IS NOT NULL
        LOOP
            PERFORM public.update_athlete_stats(athlete_rec.profile_id);
            
            -- C. UPDATE CUMULATIVE SCORE FROM EVENTS
            -- Sumamos todos los puntos/goles del jugador en este partido
            SELECT COALESCE(COUNT(*), 0) as event_count
            INTO stat_rec
            FROM public.olympics_eventos
            WHERE partido_id = NEW.id 
              AND jugador_id IN (SELECT id FROM public.olympics_jugadores WHERE profile_id = athlete_rec.profile_id)
              AND (tipo_evento = 'gol' OR tipo_evento LIKE 'punto_%' OR tipo_evento = 'punto');
              
            -- Actualizar el total_score_all_time del perfil (esto es adicional a lo que hace update_athlete_stats si no lo contempla)
            -- Nota: update_athlete_stats ya suma los scores globales del equipo en el marcador_detalle.
            -- Para jugadores individuales en equipo, podríamos querer llevar un contador de 'goles_propios' o similar.
            -- Por ahora, dejaremos que update_athlete_stats maneje victorias/derrotas.
        END LOOP;
        
    END IF;
    RETURN NEW;
END;
$$;

-- 3. Create the Trigger
DROP TRIGGER IF EXISTS trigger_sync_athlete_stats ON public.partidos;
CREATE TRIGGER trigger_sync_athlete_stats
    AFTER UPDATE ON public.partidos
    FOR EACH ROW
    WHEN (NEW.estado = 'finalizado')
    EXECUTE FUNCTION public.sync_athlete_match_stats();

-- 4. Enable Athlete Profile History View (Helper function for frontend)
DROP FUNCTION IF EXISTS public.get_athlete_event_history(uuid);
CREATE OR REPLACE FUNCTION public.get_athlete_event_history(athlete_profile_id uuid)
RETURNS TABLE (
    match_id bigint,
    fecha timestamp with time zone,
    disciplina text,
    puntos_personales bigint,
    equipo_a text,
    equipo_b text,
    marcador_final jsonb
) AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM (
        SELECT DISTINCT ON (p.id)
            p.id as match_id,
            p.fecha,
            d.name as disciplina,
            (SELECT COALESCE(SUM(
             CASE 
                 WHEN e.tipo_evento = 'gol' THEN 1
                 WHEN e.tipo_evento = 'punto_1' THEN 1
                 WHEN e.tipo_evento = 'punto_2' THEN 2
                 WHEN e.tipo_evento = 'punto_3' THEN 3
                 WHEN e.tipo_evento = 'punto' THEN 1
                 ELSE 0 
             END
         ), 0)
         FROM public.olympics_eventos e 
         WHERE e.partido_id = p.id 
           AND e.jugador_id IN (SELECT id FROM public.olympics_jugadores j2 WHERE j2.profile_id = athlete_profile_id)) as puntos_personales,
            p.equipo_a,
            p.equipo_b,
            p.marcador_detalle as marcador_final
        FROM public.partidos p
        JOIN public.disciplinas d ON p.disciplina_id = d.id
        WHERE (
            p.athlete_a_id = athlete_profile_id OR 
            p.athlete_b_id = athlete_profile_id OR
            EXISTS (SELECT 1 FROM public.olympics_jugadores j WHERE j.partido_id = p.id AND j.profile_id = athlete_profile_id)
        )
        ORDER BY p.id
    ) sub
    ORDER BY sub.fecha DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
