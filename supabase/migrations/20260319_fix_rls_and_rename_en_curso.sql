-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Fix RLS (get_my_roles) + Rename en_vivo → en_curso
-- Date: 2026-03-19
-- Description:
--   1. Fixes get_my_roles() to handle anonymous users and malformed session vars
--   2. Renames match state 'en_vivo' to 'en_curso' in partidos table
--   3. Updates notification trigger to use 'en_curso'
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 1: Fix get_my_roles() for anonymous users
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_my_roles()
RETURNS text[] AS $$
DECLARE
  val text[];
  raw text;
BEGIN
  -- Anonymous users have no roles
  IF auth.uid() IS NULL THEN
    RETURN ARRAY[]::text[];
  END IF;

  -- Try session cache first
  raw := current_setting('app.current_user_roles', true);
  IF raw IS NOT NULL AND raw != '' THEN
    BEGIN
      val := raw::text[];
      IF val IS NOT NULL AND array_length(val, 1) > 0 THEN
        RETURN val;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Malformed session var, fall through to DB lookup
      NULL;
    END;
  END IF;

  -- Fetch from database
  SELECT roles INTO val FROM public.profiles WHERE id = auth.uid();

  -- Cache for this transaction
  IF val IS NOT NULL THEN
    PERFORM set_config('app.current_user_roles', val::text, true);
  ELSE
    val := ARRAY[]::text[];
  END IF;

  RETURN val;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Recreate helpers (depend on get_my_roles)
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean AS $$
  SELECT 'admin' = ANY(public.get_my_roles());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_data_entry() RETURNS boolean AS $$
  SELECT 'data_entry' = ANY(public.get_my_roles());
$$ LANGUAGE sql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.is_staff_fast() RETURNS boolean AS $$
  SELECT public.get_my_roles() && ARRAY['admin', 'data_entry', 'periodista']::text[];
$$ LANGUAGE sql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 2: Rename 'en_vivo' → 'en_curso' in partidos data
-- ═══════════════════════════════════════════════════════════════════════════════

-- Update any existing matches that are currently 'en_vivo'
UPDATE public.partidos SET estado = 'en_curso' WHERE estado = 'en_vivo';


-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 3: Update notification trigger to use 'en_curso'
-- ═══════════════════════════════════════════════════════════════════════════════

-- Recreate the trigger function with 'en_curso' instead of 'en_vivo'
CREATE OR REPLACE FUNCTION public.notify_on_match_state_change()
RETURNS TRIGGER AS $$
DECLARE
    usr RECORD;
    notif_type text;
    notif_title text;
    notif_body text;
    sport_name text;
    team_a text;
    team_b text;
    pref_column text;
BEGIN
    -- Only fire on state changes
    IF OLD.estado = NEW.estado THEN
        RETURN NEW;
    END IF;

    -- Get sport name
    SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;

    team_a := NEW.equipo_a;
    team_b := NEW.equipo_b;

    -- Determine notification type
    IF NEW.estado = 'en_curso' AND OLD.estado = 'programado' THEN
        notif_type := 'match_start';
        notif_title := '🔴 ¡Partido en curso!';
        notif_body := COALESCE(sport_name, 'Deporte') || ': ' || team_a || ' vs ' || team_b || ' ha comenzado';
        pref_column := 'match_start';
    ELSIF NEW.estado = 'finalizado' AND OLD.estado = 'en_curso' THEN
        notif_type := 'match_end';
        notif_title := '🏁 Partido finalizado';
        notif_body := COALESCE(sport_name, 'Deporte') || ': ' || team_a || ' vs ' || team_b || ' ha terminado';
        pref_column := 'match_end';
    ELSE
        RETURN NEW;
    END IF;

    -- Insert notifications for all subscribed users
    FOR usr IN
        SELECT p.id AS user_id
        FROM public.profiles p
        LEFT JOIN public.notification_preferences np ON np.user_id = p.id
        WHERE
            CASE pref_column
                WHEN 'match_start' THEN COALESCE(np.match_start, true)
                WHEN 'match_end' THEN COALESCE(np.match_end, true)
                ELSE true
            END
    LOOP
        INSERT INTO public.notifications (user_id, type, title, body, metadata)
        VALUES (
            usr.user_id,
            notif_type,
            notif_title,
            notif_body,
            jsonb_build_object(
                'match_id', NEW.id,
                'sport', COALESCE(sport_name, 'unknown'),
                'team_a', team_a,
                'team_b', team_b,
                'estado', NEW.estado
            )
        );
    END LOOP;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Never block the UPDATE even if notifications fail
    RAISE WARNING 'notify_on_match_state_change failed: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Ensure trigger exists
DROP TRIGGER IF EXISTS trigger_match_state_notify ON public.partidos;
CREATE TRIGGER trigger_match_state_notify
    AFTER UPDATE OF estado ON public.partidos
    FOR EACH ROW
    EXECUTE FUNCTION public.notify_on_match_state_change();


-- ═══════════════════════════════════════════════════════════════════════════════
-- PHASE 4: Update validate_marcador trigger (if it references en_vivo)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Notify PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
