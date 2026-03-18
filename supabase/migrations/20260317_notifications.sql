-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Notification System (notifications, preferences, friend requests)
-- Date: 2026-03-17
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

-- ════════════════════════════════════════════════════════════════════════════════
-- 1. NOTIFICATIONS TABLE
-- ════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    type text NOT NULL DEFAULT 'system',
    -- Types: match_start, match_end, score_update, friend_request, friend_accepted, system
    title text NOT NULL,
    body text,
    metadata jsonb DEFAULT '{}'::jsonb,
    -- metadata examples:
    --   match_start:    { "match_id": 123, "sport": "Fútbol", "teams": "ING vs MED" }
    --   friend_request: { "sender_id": "uuid", "sender_name": "Juan", "request_id": "uuid" }
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/update/delete their own notifications
CREATE POLICY "Users can view own notifications"
    ON public.notifications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
    ON public.notifications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications"
    ON public.notifications FOR DELETE
    USING (auth.uid() = user_id);

-- System/triggers can insert notifications for any user
CREATE POLICY "System can insert notifications"
    ON public.notifications FOR INSERT
    WITH CHECK (true);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;


-- ════════════════════════════════════════════════════════════════════════════════
-- 2. NOTIFICATION PREFERENCES TABLE
-- ════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
    match_start boolean DEFAULT true,
    match_end boolean DEFAULT true,
    score_updates boolean DEFAULT false,
    friend_requests boolean DEFAULT true,
    followed_sports text[] DEFAULT '{}'::text[],
    -- Empty array = ALL sports. Otherwise only listed sports trigger notifications.
    created_at timestamptz DEFAULT NOW() NOT NULL,
    updated_at timestamptz DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_notification_prefs_user ON public.notification_preferences(user_id);

-- Enable RLS
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

-- Policies: Users can only see/update their own preferences
CREATE POLICY "Users can view own preferences"
    ON public.notification_preferences FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
    ON public.notification_preferences FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
    ON public.notification_preferences FOR INSERT
    WITH CHECK (auth.uid() = user_id);


-- ════════════════════════════════════════════════════════════════════════════════
-- 3. FRIEND REQUESTS TABLE
-- ════════════════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS public.friend_requests (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    receiver_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    status text DEFAULT 'pending' NOT NULL,
    -- Status: pending, accepted, rejected
    created_at timestamptz DEFAULT NOW() NOT NULL,
    updated_at timestamptz DEFAULT NOW() NOT NULL,
    UNIQUE(sender_id, receiver_id),
    CHECK (sender_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_receiver ON public.friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_friend_requests_sender ON public.friend_requests(sender_id, status);

-- Enable RLS
ALTER TABLE public.friend_requests ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view own friend requests"
    ON public.friend_requests FOR SELECT
    USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can send friend requests"
    ON public.friend_requests FOR INSERT
    WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update friend requests they received"
    ON public.friend_requests FOR UPDATE
    USING (auth.uid() = receiver_id);

CREATE POLICY "Users can delete friend requests they sent"
    ON public.friend_requests FOR DELETE
    USING (auth.uid() = sender_id);

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.friend_requests;


-- ════════════════════════════════════════════════════════════════════════════════
-- 4. TRIGGER: Auto-notify on friend request
-- ════════════════════════════════════════════════════════════════════════════════

-- 4a. When a friend request is CREATED → notify receiver
CREATE OR REPLACE FUNCTION public.notify_on_friend_request()
RETURNS TRIGGER AS $$
DECLARE
    sender_name text;
    sender_avatar text;
    prefs_ok boolean;
BEGIN
    -- Get sender info
    SELECT full_name, avatar_url INTO sender_name, sender_avatar
    FROM public.profiles WHERE id = NEW.sender_id;

    -- Check receiver preferences
    SELECT COALESCE(
        (SELECT friend_requests FROM public.notification_preferences WHERE user_id = NEW.receiver_id),
        true
    ) INTO prefs_ok;

    IF prefs_ok THEN
        INSERT INTO public.notifications (user_id, type, title, body, metadata)
        VALUES (
            NEW.receiver_id,
            'friend_request',
            'Nueva solicitud de amistad',
            COALESCE(sender_name, 'Alguien') || ' quiere ser tu amigo',
            jsonb_build_object(
                'sender_id', NEW.sender_id,
                'sender_name', COALESCE(sender_name, 'Usuario'),
                'sender_avatar', sender_avatar,
                'request_id', NEW.id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request_created ON public.friend_requests;
CREATE TRIGGER on_friend_request_created
    AFTER INSERT ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_request();

-- 4b. When a friend request is ACCEPTED → notify sender
CREATE OR REPLACE FUNCTION public.notify_on_friend_accepted()
RETURNS TRIGGER AS $$
DECLARE
    accepter_name text;
    accepter_avatar text;
BEGIN
    IF NEW.status = 'accepted' AND OLD.status = 'pending' THEN
        -- Get accepter info
        SELECT full_name, avatar_url INTO accepter_name, accepter_avatar
        FROM public.profiles WHERE id = NEW.receiver_id;

        INSERT INTO public.notifications (user_id, type, title, body, metadata)
        VALUES (
            NEW.sender_id,
            'friend_accepted',
            '¡Solicitud aceptada!',
            COALESCE(accepter_name, 'Alguien') || ' aceptó tu solicitud de amistad',
            jsonb_build_object(
                'accepter_id', NEW.receiver_id,
                'accepter_name', COALESCE(accepter_name, 'Usuario'),
                'accepter_avatar', accepter_avatar,
                'request_id', NEW.id
            )
        );
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_friend_request_accepted ON public.friend_requests;
CREATE TRIGGER on_friend_request_accepted
    AFTER UPDATE ON public.friend_requests
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_friend_accepted();


-- ════════════════════════════════════════════════════════════════════════════════
-- 5. TRIGGER: Auto-notify on match state change
-- ════════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION public.notify_on_match_state_change()
RETURNS TRIGGER AS $$
DECLARE
    sport_name text;
    team_a text;
    team_b text;
    notif_type text;
    notif_title text;
    notif_body text;
    pref_column text;
    usr RECORD;
BEGIN
    -- Only trigger when estado actually changes
    IF OLD.estado = NEW.estado THEN
        RETURN NEW;
    END IF;

    -- Get sport name
    SELECT name INTO sport_name FROM public.disciplinas WHERE id = NEW.disciplina_id;

    team_a := NEW.equipo_a;
    team_b := NEW.equipo_b;

    -- Determine notification type
    IF NEW.estado = 'en_vivo' AND OLD.estado = 'programado' THEN
        notif_type := 'match_start';
        notif_title := '🔴 ¡Partido en vivo!';
        notif_body := COALESCE(sport_name, 'Deporte') || ': ' || team_a || ' vs ' || team_b || ' ha comenzado';
        pref_column := 'match_start';
    ELSIF NEW.estado = 'finalizado' AND OLD.estado = 'en_vivo' THEN
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
            -- Check that the user has the relevant preference enabled (default true if no prefs row)
            CASE pref_column
                WHEN 'match_start' THEN COALESCE(np.match_start, true)
                WHEN 'match_end' THEN COALESCE(np.match_end, true)
                ELSE true
            END
            -- Check sport filter: empty array = all sports, otherwise must include this sport
            AND (
                np.followed_sports IS NULL
                OR array_length(np.followed_sports, 1) IS NULL
                OR COALESCE(sport_name, '') = ANY(np.followed_sports)
            )
    LOOP
        INSERT INTO public.notifications (user_id, type, title, body, metadata)
        VALUES (
            usr.user_id,
            notif_type,
            notif_title,
            notif_body,
            jsonb_build_object(
                'match_id', NEW.id,
                'sport', COALESCE(sport_name, 'Deporte'),
                'teams', team_a || ' vs ' || team_b,
                'estado', NEW.estado
            )
        );
    END LOOP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_match_state_change ON public.partidos;
CREATE TRIGGER on_match_state_change
    AFTER UPDATE ON public.partidos
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_match_state_change();
