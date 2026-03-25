-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
-- Migration: Profile Name Color
-- Date: 2026-03-24
-- Adds name_color to profiles so users can customize their display name color.
-- Gold/yellow tones are enforced as forbidden on the frontend.
-- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS name_color TEXT DEFAULT NULL;

-- Sync to public_profiles so other users can see the color
ALTER TABLE public.public_profiles
    ADD COLUMN IF NOT EXISTS name_color TEXT DEFAULT NULL;

-- Update sync trigger to include name_color
CREATE OR REPLACE FUNCTION public.sync_public_profile_on_update()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.public_profiles
    SET
        display_name  = NEW.full_name,
        avatar_url    = NEW.avatar_url,
        email         = NEW.email,
        carreras_ids  = NEW.carreras_ids,
        name_color    = NEW.name_color
    WHERE id = NEW.id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

NOTIFY pgrst, 'reload schema';
