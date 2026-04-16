-- Seed initial value for hide_tenis_brackets (missed in 20260407_site_config)
INSERT INTO public.site_config (key, value)
VALUES ('hide_tenis_brackets', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
