-- FIX: Sync ALL users to public_profiles to prevent FK errors
-- Run this in Supabase SQL Editor

-- 1. Insert missing profiles for existing users
INSERT INTO public.public_profiles (id, email, display_name, created_at, updated_at)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1)), 
    created_at, 
    created_at
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Create a Trigger to ensure future users get a profile automatically
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.public_profiles (id, email, display_name)
  VALUES (new.id, new.email, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)));
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- 3. Verify Constraints
-- Ensure proper RLS if not already set (simplified for debugging)
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone" ON public_profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public_profiles
  FOR UPDATE USING (auth.uid() = id);
