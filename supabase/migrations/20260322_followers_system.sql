-- 1. Create Follower Tables
CREATE TABLE public.user_followers (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    following_profile_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, following_profile_id)
);

CREATE TABLE public.career_followers (
    follower_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    career_id BIGINT REFERENCES public.carreras(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (follower_id, career_id)
);

-- 2. Add counter columns
ALTER TABLE public.profiles ADD COLUMN followers_count INT DEFAULT 0 NOT NULL;
ALTER TABLE public.carreras ADD COLUMN followers_count INT DEFAULT 0 NOT NULL;

-- 3. Setup Triggers for user_followers
CREATE OR REPLACE FUNCTION update_user_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.profiles
        SET followers_count = followers_count + 1
        WHERE id = NEW.following_profile_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.profiles
        SET followers_count = followers_count - 1
        WHERE id = OLD.following_profile_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_user_follow
    AFTER INSERT OR DELETE ON public.user_followers
    FOR EACH ROW EXECUTE FUNCTION update_user_followers_count();

-- 4. Setup Triggers for career_followers
CREATE OR REPLACE FUNCTION update_career_followers_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE public.carreras
        SET followers_count = followers_count + 1
        WHERE id = NEW.career_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE public.carreras
        SET followers_count = followers_count - 1
        WHERE id = OLD.career_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_career_follow
    AFTER INSERT OR DELETE ON public.career_followers
    FOR EACH ROW EXECUTE FUNCTION update_career_followers_count();

-- 5. Enable RLS ensuring strict DevSecOps compliance
ALTER TABLE public.user_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.career_followers ENABLE ROW LEVEL SECURITY;

-- user_followers Policies
CREATE POLICY "Anyone can view user followers"
    ON public.user_followers FOR SELECT
    USING (true);

CREATE POLICY "Users can follow others"
    ON public.user_followers FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow others"
    ON public.user_followers FOR DELETE
    USING (auth.uid() = follower_id);

-- career_followers Policies
CREATE POLICY "Anyone can view career followers"
    ON public.career_followers FOR SELECT
    USING (true);

CREATE POLICY "Users can follow careers"
    ON public.career_followers FOR INSERT
    WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "Users can unfollow careers"
    ON public.career_followers FOR DELETE
    USING (auth.uid() = follower_id);
