-- ═══════════════════════════════════════════════════════════════════════════════
-- Score Update Notifications
--
-- Only sends notifications for:
-- 1. Fútbol: every goal (detailed: who scored, current score)
-- 2. Voleibol/Tenis/Tenis de Mesa: only when a set ends (who won the set)
-- 3. Other sports (Baloncesto, Ajedrez, etc.): NO score notifications
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.notify_on_score_change()
RETURNS TRIGGER AS $$
DECLARE
    usr RECORD;
    sport_name text;
    team_a text;
    team_b text;
    notif_title text;
    notif_body text;
    old_det jsonb;
    new_det jsonb;
    -- Set sport variables
    old_sets_a int;
    old_sets_b int;
    new_sets_a int;
    new_sets_b int;
    set_winner text;
    set_number int;
    -- Fútbol variables
    old_goles_a int;
    old_goles_b int;
    new_goles_a int;
    new_goles_b int;
    gol_equipo text;
BEGIN
    -- Only fire when marcador_detalle actually changes
    IF NOT (OLD.marcador_detalle IS DISTINCT FROM NEW.marcador_detalle) THEN
        RETURN NEW;
    END IF;

    -- Only fire for live matches
    IF NEW.estado != 'en_curso' THEN
        RETURN NEW;
    END IF;

    -- Get sport name
    SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;
    IF sport_name IS NULL THEN RETURN NEW; END IF;

    team_a := NEW.equipo_a;
    team_b := NEW.equipo_b;
    old_det := COALESCE(OLD.marcador_detalle, '{}'::jsonb);
    new_det := COALESCE(NEW.marcador_detalle, '{}'::jsonb);

    -- ── FÚTBOL: notify on every goal ──────────────────────────────────────────
    IF sport_name = 'Fútbol' THEN
        old_goles_a := COALESCE((old_det->>'goles_a')::int, 0);
        old_goles_b := COALESCE((old_det->>'goles_b')::int, 0);
        new_goles_a := COALESCE((new_det->>'goles_a')::int, 0);
        new_goles_b := COALESCE((new_det->>'goles_b')::int, 0);

        -- No change in goals → skip
        IF old_goles_a = new_goles_a AND old_goles_b = new_goles_b THEN
            RETURN NEW;
        END IF;

        IF new_goles_a > old_goles_a THEN
            gol_equipo := team_a;
        ELSIF new_goles_b > old_goles_b THEN
            gol_equipo := team_b;
        ELSE
            RETURN NEW; -- score decreased (correction), skip
        END IF;

        notif_title := '⚽ ¡Gol de ' || gol_equipo || '!';
        notif_body := team_a || ' ' || new_goles_a || ' - ' || new_goles_b || ' ' || team_b;

    -- ── SET SPORTS: notify only when a set ends ───────────────────────────────
    ELSIF sport_name IN ('Voleibol', 'Tenis', 'Tenis de Mesa') THEN
        old_sets_a := COALESCE((old_det->>'sets_a')::int, COALESCE((old_det->>'sets_total_a')::int, 0));
        old_sets_b := COALESCE((old_det->>'sets_b')::int, COALESCE((old_det->>'sets_total_b')::int, 0));
        new_sets_a := COALESCE((new_det->>'sets_a')::int, COALESCE((new_det->>'sets_total_a')::int, 0));
        new_sets_b := COALESCE((new_det->>'sets_b')::int, COALESCE((new_det->>'sets_total_b')::int, 0));

        -- No change in sets won → skip (just a point change within a set)
        IF old_sets_a = new_sets_a AND old_sets_b = new_sets_b THEN
            RETURN NEW;
        END IF;

        IF new_sets_a > old_sets_a THEN
            set_winner := team_a;
        ELSIF new_sets_b > old_sets_b THEN
            set_winner := team_b;
        ELSE
            RETURN NEW;
        END IF;

        set_number := new_sets_a + new_sets_b;

        notif_title := '🏐 Set ' || set_number || ' finalizado';
        notif_body := set_winner || ' gana el set · ' || team_a || ' ' || new_sets_a || ' - ' || new_sets_b || ' ' || team_b;

    ELSE
        -- Other sports (Baloncesto, Ajedrez, Natación): no score notifications
        RETURN NEW;
    END IF;

    -- ── Insert notifications for subscribed users ─────────────────────────────
    FOR usr IN
        SELECT p.id AS user_id
        FROM public.profiles p
        LEFT JOIN public.notification_preferences np ON np.user_id = p.id
        WHERE COALESCE(np.score_updates, false) = true
          AND (
              np.followed_sports IS NULL
              OR array_length(np.followed_sports, 1) IS NULL
              OR sport_name = ANY(np.followed_sports)
          )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, body, metadata)
        VALUES (
            usr.user_id,
            'score_update',
            notif_title,
            notif_body,
            jsonb_build_object(
                'match_id', NEW.id,
                'sport', sport_name,
                'team_a', team_a,
                'team_b', team_b,
                'score_a', CASE
                    WHEN sport_name = 'Fútbol' THEN new_goles_a
                    ELSE new_sets_a
                END,
                'score_b', CASE
                    WHEN sport_name = 'Fútbol' THEN new_goles_b
                    ELSE new_sets_b
                END
            )
        );
    END LOOP;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'notify_on_score_change failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop any old score-related triggers
DROP TRIGGER IF EXISTS trigger_score_notify ON public.partidos;

-- Create trigger: only fires when marcador_detalle changes
CREATE TRIGGER trigger_score_notify
    AFTER UPDATE OF marcador_detalle ON public.partidos
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_score_change();
