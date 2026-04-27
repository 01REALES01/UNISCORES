-- Add instagram_url column to noticias table
-- This allows linking Instagram posts to news articles
ALTER TABLE noticias ADD COLUMN IF NOT EXISTS instagram_url TEXT;
