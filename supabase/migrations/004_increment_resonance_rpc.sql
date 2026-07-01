-- Atomic resonance increment/decrement
-- Prevents race conditions when multiple users resonate simultaneously
-- Run in Supabase SQL Editor

CREATE OR REPLACE FUNCTION increment_resonance(answer_id uuid, delta integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE answers
  SET resonance_count = GREATEST(0, resonance_count + delta)
  WHERE id = answer_id
  RETURNING resonance_count INTO new_count;

  RETURN COALESCE(new_count, 0);
END;
$$;
