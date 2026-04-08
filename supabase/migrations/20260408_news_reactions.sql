-- ============================================
-- News Reactions Table (1 reaction per user per article)
-- Supports both main and extra emojis
-- ============================================

CREATE TABLE IF NOT EXISTS public.news_reactions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    noticia_id uuid NOT NULL REFERENCES public.noticias(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    emoji text NOT NULL,
    created_at timestamptz DEFAULT now(),
    UNIQUE (noticia_id, user_id)
);

-- Index for fast lookups by article
CREATE INDEX IF NOT EXISTS idx_news_reactions_noticia ON public.news_reactions(noticia_id);

-- RLS
ALTER TABLE public.news_reactions ENABLE ROW LEVEL SECURITY;

-- Anyone can view reactions (public counts)
DROP POLICY IF EXISTS "Anyone can view reactions" ON public.news_reactions;
CREATE POLICY "Anyone can view reactions"
    ON public.news_reactions FOR SELECT
    USING (true);

-- Authenticated users can insert their own reactions
DROP POLICY IF EXISTS "Users can insert own reactions" ON public.news_reactions;
CREATE POLICY "Users can insert own reactions"
    ON public.news_reactions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Authenticated users can update their own reactions (switch emoji)
DROP POLICY IF EXISTS "Users can update own reactions" ON public.news_reactions;
CREATE POLICY "Users can update own reactions"
    ON public.news_reactions FOR UPDATE
    USING (auth.uid() = user_id);

-- Authenticated users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete own reactions" ON public.news_reactions;
CREATE POLICY "Users can delete own reactions"
    ON public.news_reactions FOR DELETE
    USING (auth.uid() = user_id);
