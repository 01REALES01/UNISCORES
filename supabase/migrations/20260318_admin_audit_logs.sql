-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Admin Audit Logs (immutable bitácora)
-- Date: 2026-03-18
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    created_at timestamptz DEFAULT NOW() NOT NULL,
    admin_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    admin_name text,
    admin_email text,
    action_type text NOT NULL,
    -- action_type:
    --   CREATE_MATCH, UPDATE_MATCH, DELETE_MATCH, FINALIZE_MATCH, START_MATCH
    --   CREATE_EVENT, DELETE_EVENT
    --   UPDATE_SCORE, CHANGE_PERIOD
    --   CREATE_NEWS, UPDATE_NEWS, DELETE_NEWS, TOGGLE_PUBLISH
    --   UPDATE_ROLE
    --   ADD_PLAYER
    entity_type text NOT NULL,
    -- entity_type: 'partido', 'evento', 'noticia', 'usuario', 'jugador'
    entity_id text,
    details jsonb DEFAULT '{}'::jsonb
    -- details stores contextual data: { before, after, description, ... }
);

-- Índices optimizados para la página de bitácora
CREATE INDEX IF NOT EXISTS idx_audit_created ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_admin ON public.admin_audit_logs(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_type ON public.admin_audit_logs(action_type, created_at DESC);

-- RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Lectura: solo admins
DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.admin_audit_logs;
CREATE POLICY "Admins can read audit logs"
    ON public.admin_audit_logs FOR SELECT
    USING (public.has_role(auth.uid(), 'admin'));

-- Escritura: admins y data_entry
DROP POLICY IF EXISTS "Admins can insert audit logs" ON public.admin_audit_logs;
CREATE POLICY "Staff can insert audit logs"
    ON public.admin_audit_logs FOR INSERT
    WITH CHECK (
        public.has_role(auth.uid(), 'admin')
        OR public.has_role(auth.uid(), 'data_entry')
    );

-- Inmutabilidad: nadie puede UPDATE ni DELETE
DROP POLICY IF EXISTS "Audit logs are immutable" ON public.admin_audit_logs;
CREATE POLICY "Audit logs are immutable"
    ON public.admin_audit_logs FOR UPDATE USING (false);

DROP POLICY IF EXISTS "Audit logs cannot be deleted" ON public.admin_audit_logs;
CREATE POLICY "Audit logs cannot be deleted"
    ON public.admin_audit_logs FOR DELETE USING (false);

COMMENT ON TABLE public.admin_audit_logs IS 'Registro histórico inmutable de acciones administrativas.';
