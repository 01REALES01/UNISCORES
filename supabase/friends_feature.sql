-- ─────────────────────────────────────────────────────────────────────────────
-- Migración: Sistema de Amigos
-- Tabla user_friends con estado pending/accepted/blocked
-- RLS estricto: cada usuario solo ve/modifica sus propias relaciones
-- ─────────────────────────────────────────────────────────────────────────────

-- Enum de estado de amistad
DO $$ BEGIN
    CREATE TYPE friend_status AS ENUM ('pending', 'accepted', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Tabla principal
CREATE TABLE IF NOT EXISTS public.user_friends (
    id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    requester_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    addressee_id  uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    status        friend_status NOT NULL DEFAULT 'pending',
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    -- Evitar auto-amistad
    CONSTRAINT no_self_friend CHECK (requester_id <> addressee_id)
);

-- Índice único para evitar duplicados bidireccionales
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_friends_unique ON public.user_friends (
    LEAST(requester_id, addressee_id),
    GREATEST(requester_id, addressee_id)
);

-- Índices de rendimiento
CREATE INDEX IF NOT EXISTS idx_user_friends_requester ON public.user_friends(requester_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_addressee ON public.user_friends(addressee_id);
CREATE INDEX IF NOT EXISTS idx_user_friends_status     ON public.user_friends(status);

-- Trigger: updated_at automático
CREATE OR REPLACE FUNCTION public.update_friends_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friends_updated_at ON public.user_friends;
CREATE TRIGGER trg_friends_updated_at
    BEFORE UPDATE ON public.user_friends
    FOR EACH ROW EXECUTE FUNCTION public.update_friends_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.user_friends ENABLE ROW LEVEL SECURITY;

-- SELECT: solo puedes ver tus propias relaciones (como requester o addressee)
CREATE POLICY "friends_select_own"
    ON public.user_friends FOR SELECT
    USING (
        auth.uid() = requester_id OR
        auth.uid() = addressee_id
    );

-- INSERT: solo puedes enviar solicitudes como tú mismo
CREATE POLICY "friends_insert_own"
    ON public.user_friends FOR INSERT
    WITH CHECK (
        auth.uid() = requester_id AND
        requester_id <> addressee_id
    );

-- UPDATE: solo el addressee puede aceptar/rechazar (cambia status)
-- o cualquiera de los dos puede bloquear
CREATE POLICY "friends_update_own"
    ON public.user_friends FOR UPDATE
    USING (
        auth.uid() = addressee_id OR
        auth.uid() = requester_id
    )
    WITH CHECK (
        -- addressee puede aceptar/rechazar/bloquear
        (auth.uid() = addressee_id AND status IN ('accepted', 'blocked')) OR
        -- requester solo puede bloquear (no puede auto-aceptar su propia solicitud)
        (auth.uid() = requester_id AND status = 'blocked')
    );

-- DELETE: cualquiera de los dos puede eliminar (cancelar solicitud, unfriend, desbloquear)
CREATE POLICY "friends_delete_own"
    ON public.user_friends FOR DELETE
    USING (
        auth.uid() = requester_id OR
        auth.uid() = addressee_id
    );

-- ─────────────────────────────────────────────────────────────────────────────
-- Función auxiliar: obtener amigos aceptados de un usuario con datos de perfil
-- SECURITY DEFINER para ejecutarse con privilegios del owner y respetar RLS de profiles
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.get_friends_with_profiles(p_user_id uuid)
RETURNS TABLE (
    friend_id    uuid,
    full_name    text,
    avatar_url   text,
    tagline      text,
    points       integer,
    carreras_ids integer[],
    roles        text[],
    friendship_id uuid,
    since        timestamptz
)
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT
        CASE
            WHEN uf.requester_id = p_user_id THEN uf.addressee_id
            ELSE uf.requester_id
        END AS friend_id,
        p.full_name::text,
        p.avatar_url::text,
        p.tagline::text,
        p.points,
        p.carreras_ids,
        p.roles::text[],
        uf.id AS friendship_id,
        uf.updated_at AS since
    FROM public.user_friends uf
    JOIN public.profiles p ON p.id = CASE
        WHEN uf.requester_id = p_user_id THEN uf.addressee_id
        ELSE uf.requester_id
    END
    WHERE (uf.requester_id = p_user_id OR uf.addressee_id = p_user_id)
      AND uf.status = 'accepted'
    ORDER BY uf.updated_at DESC;
$$;

-- Otorgar permisos de ejecución al rol anon y authenticated
GRANT EXECUTE ON FUNCTION public.get_friends_with_profiles(uuid) TO anon, authenticated;

-- Agregar tabla a realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_friends;
