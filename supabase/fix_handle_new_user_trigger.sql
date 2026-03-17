-- ─────────────────────────────────────────────────────────────────────────────
-- Fix: trigger handle_new_user usa columna 'role' (vieja) en vez de 'roles[]'
-- Aplica esto en el dashboard de Supabase → SQL Editor
-- ─────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (
        id,
        email,
        full_name,
        roles,
        is_public,
        points,
        created_at,
        updated_at
    )
    VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name',
            NEW.raw_user_meta_data->>'preferred_username',
            split_part(COALESCE(NEW.email, 'usuario@'), '@', 1)
        ),
        ARRAY['public']::text[],
        true,
        0,
        NOW(),
        NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
        email      = EXCLUDED.email,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

-- Asegurar que el trigger existe (recrear si no está)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
