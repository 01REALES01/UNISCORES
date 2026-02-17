-- Migration: Add winner prediction support
-- Run this in Supabase SQL Editor

ALTER TABLE pronosticos 
ADD COLUMN IF NOT EXISTS prediction_type text DEFAULT 'score', -- 'score' | 'winner'
ADD COLUMN IF NOT EXISTS winner_pick text; -- 'A', 'B', 'DRAW'

-- Make goals columns nullable if prediction_type is 'winner'
ALTER TABLE pronosticos ALTER COLUMN goles_a DROP NOT NULL;
ALTER TABLE pronosticos ALTER COLUMN goles_b DROP NOT NULL;
