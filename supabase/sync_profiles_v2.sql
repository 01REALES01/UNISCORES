-- FIX V2: Sync public_profiles without timestamp columns (safer)
-- Run this in Supabase SQL Editor

-- 1. Insert missing profiles (ignoring timestamp columns which might not exist or have defaults)
INSERT INTO public.public_profiles (id, email, display_name)
SELECT 
    id, 
    email, 
    COALESCE(raw_user_meta_data->>'full_name', split_part(email, '@', 1))
FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 2. Create Trigger for future users
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

-- 3. Ensure Permissions
ALTER TABLE public_profiles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  -- Re-create policies only if needed (prevent errors if they exist)
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Public profiles are viewable by everyone') THEN
    CREATE POLICY "Public profiles are viewable by everyone" ON public_profiles FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Users can insert their own profile') THEN
     CREATE POLICY "Users can insert their own profile" ON public_profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'public_profiles' AND policyname = 'Users can update own profile') THEN
     CREATE POLICY "Users can update own profile" ON public_profiles FOR UPDATE USING (auth.uid() = id);
  END IF;
END $$;
