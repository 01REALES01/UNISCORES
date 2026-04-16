-- Fix RLS and grants for site_config so admin (anon/authenticated) can upsert
DROP POLICY IF EXISTS "Allow admin all access to site_config" ON public.site_config;

CREATE POLICY "Allow all access to site_config"
ON public.site_config FOR ALL
TO anon, authenticated
USING (true)
WITH CHECK (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_config TO anon, authenticated;

-- Seed missing initial row (idempotent)
INSERT INTO public.site_config (key, value)
VALUES ('hide_tenis_brackets', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
