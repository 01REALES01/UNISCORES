-- Función para calcular ganadores y puntos de quiniela
-- Se ejecuta automáticamente cuando un partido cambia a estado 'finalizado'

CREATE OR REPLACE FUNCTION public.calculate_match_results()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    -- Variables para el resultado real
    score_a integer := 0;
    score_b integer := 0;
    real_winner text; -- 'A', 'B', 'DRAW'
    
    -- Variables para iterar pronósticos
    prediction record;
    points_awarded integer;
    
    -- Datos del partido
    sport_name text;
    details jsonb;
BEGIN
    -- Solo ejecutar si el estado cambia a 'finalizado'
    IF NEW.estado = 'finalizado' AND (OLD.estado IS DISTINCT FROM 'finalizado') THEN
        
        -- 1. Obtener disciplina y detalles
        SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;
        details := NEW.marcador_detalle;
        
        -- 2. Determinar Ganador Real según deporte
        IF sport_name = 'Fútbol' OR sport_name = 'Futsal' THEN
            -- En fútbol cuentan los goles totales
            score_a := COALESCE((details->>'goles_a')::int, 0);
            score_b := COALESCE((details->>'goles_b')::int, 0);
            
            IF score_a > score_b THEN real_winner := 'A';
            ELSIF score_b > score_a THEN real_winner := 'B';
            ELSE real_winner := 'DRAW';
            END IF;
            
        ELSIF sport_name = 'Voleibol' OR sport_name = 'Tenis' OR sport_name = 'Tenis de Mesa' THEN
            -- En deportes de sets, gana quien tenga más sets
            score_a := COALESCE((details->>'sets_a')::int, 0);
            score_b := COALESCE((details->>'sets_b')::int, 0);
            
            -- Si sets están empatados (raro en fin de partido pero posible en error), check puntos totales?
            -- Asumiremos que si finalizó, alguien ganó sets.
            IF score_a > score_b THEN real_winner := 'A';
            ELSE real_winner := 'B'; -- Empate no suele existir en Volley/Tenis
            END IF;
            
        ELSIF sport_name = 'Baloncesto' THEN
            -- En basket cuentan puntos totales
            score_a := COALESCE((details->>'total_a')::int, 0);
            score_b := COALESCE((details->>'total_b')::int, 0);
            
            IF score_a > score_b THEN real_winner := 'A';
            ELSE real_winner := 'B';
            END IF;
            
        ELSE
            -- Default (e.g. Ajedrez)
            score_a := COALESCE((details->>'total_a')::int, 0);
            score_b := COALESCE((details->>'total_b')::int, 0);
             IF score_a > score_b THEN real_winner := 'A';
            ELSIF score_b > score_a THEN real_winner := 'B';
            ELSE real_winner := 'DRAW';
            END IF;
        END IF;

        -- 3. Calcular Puntos para cada Pronóstico
        FOR prediction IN 
            SELECT * FROM public.pronosticos WHERE match_id = NEW.id
        LOOP
            points_awarded := 0;
            
            IF prediction.prediction_type = 'winner' THEN
                -- Modo Ganador: +3 Puntos si acierta ganador
                IF prediction.winner_pick = real_winner THEN
                    points_awarded := 3;
                END IF;
                
            ELSIF prediction.prediction_type = 'score' THEN
                -- Modo Marcador Exacto (Solo Fútbol usualmente)
                -- +5 Puntos exacto, +2 Puntos si acierta ganador/empate pero no goles
                
                IF prediction.goles_a IS NOT NULL AND prediction.goles_b IS NOT NULL THEN
                    
                    -- Check exacto
                    IF prediction.goles_a = score_a AND prediction.goles_b = score_b THEN
                        points_awarded := 5;
                    ELSE
                        -- Check ganador (resultado parcial)
                        DECLARE
                            pred_winner text;
                        BEGIN
                            IF prediction.goles_a > prediction.goles_b THEN pred_winner := 'A';
                            ELSIF prediction.goles_b > prediction.goles_a THEN pred_winner := 'B';
                            ELSE pred_winner := 'DRAW';
                            END IF;
                            
                            IF pred_winner = real_winner THEN
                                points_awarded := 2;
                            END IF;
                        END;
                    END IF;
                END IF;
            END IF;
            
            -- Actualizar Pronóstico
            UPDATE public.pronosticos 
            SET puntos_ganados = points_awarded 
            WHERE id = prediction.id;
            
            -- Actualizar Perfil de Usuario (Sumar Puntos)
            -- Nota: Esto asume que puntos_ganados era NULL o 0. Si se re-corre, duplica.
            -- Para ser seguro: Recalcular total del usuario.
            UPDATE public.public_profiles
            SET points = (
                SELECT COALESCE(SUM(puntos_ganados), 0) 
                FROM public.pronosticos 
                WHERE user_id = prediction.user_id
            )
            WHERE id = prediction.user_id;
            
        END LOOP;
        
    END IF;
    
    RETURN NEW;
END;
$$;

-- Crear el Trigger
DROP TRIGGER IF EXISTS on_match_finish ON public.partidos;
CREATE TRIGGER on_match_finish
    AFTER UPDATE ON public.partidos
    FOR EACH ROW
    EXECUTE FUNCTION public.calculate_match_results();
