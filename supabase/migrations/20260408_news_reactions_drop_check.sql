-- ============================================
-- Remove Emoji Check Constraint
-- ============================================

-- If there was a previous constraint limiting emojis, remove it 
-- to allow the full picker functionality.
ALTER TABLE public.news_reactions 
DROP CONSTRAINT IF EXISTS news_reactions_emoji_check;
