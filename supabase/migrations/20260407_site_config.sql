-- Table for global site configuration
CREATE TABLE IF NOT EXISTS public.site_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Initial configuration for bracket visibility
INSERT INTO public.site_config (key, value)
VALUES ('hide_team_brackets', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- RLS
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow admin all access to site_config"
ON public.site_config FOR ALL
USING (true)
WITH CHECK (true);
