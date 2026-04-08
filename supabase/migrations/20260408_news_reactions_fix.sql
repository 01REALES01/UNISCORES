-- ============================================
-- Fix News Reactions Unique Constraint
-- ============================================

-- Ensure the unique constraint exists for upsert to work
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'news_reactions_noticia_id_user_id_key'
    ) THEN
        ALTER TABLE public.news_reactions 
        ADD CONSTRAINT news_reactions_noticia_id_user_id_key UNIQUE (noticia_id, user_id);
    END IF;
END $$;
