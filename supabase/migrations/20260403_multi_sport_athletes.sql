-- ─────────────────────────────────────────────────────────────────────────────
-- 20260403_multi_sport_athletes.sql
-- Tabla join N:N para que un deportista pueda tener múltiples disciplinas
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.profile_disciplinas (
  id            BIGSERIAL PRIMARY KEY,
  profile_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  disciplina_id BIGINT NOT NULL REFERENCES public.disciplinas(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, disciplina_id)
);

-- RLS
ALTER TABLE public.profile_disciplinas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read profile_disciplinas"
  ON public.profile_disciplinas FOR SELECT USING (true);

CREATE POLICY "Admins manage profile_disciplinas"
  ON public.profile_disciplinas FOR ALL
  USING (
    auth.uid() IN (
      SELECT id FROM public.profiles WHERE 'admin' = ANY(roles)
    )
  );

-- Migrar datos existentes desde el campo escalar
INSERT INTO public.profile_disciplinas (profile_id, disciplina_id)
SELECT id, athlete_disciplina_id
FROM public.profiles
WHERE athlete_disciplina_id IS NOT NULL
ON CONFLICT (profile_id, disciplina_id) DO NOTHING;
