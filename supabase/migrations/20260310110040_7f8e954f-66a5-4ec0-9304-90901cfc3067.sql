
-- Add useful_count to qa_answers
ALTER TABLE public.qa_answers ADD COLUMN IF NOT EXISTS useful_count integer NOT NULL DEFAULT 0;

-- Create qa_answer_votes table for tracking who voted
CREATE TABLE public.qa_answer_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id uuid REFERENCES public.qa_answers(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(answer_id, user_id)
);

-- Enable RLS
ALTER TABLE public.qa_answer_votes ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage their own votes
CREATE POLICY "Users can view all votes"
  ON public.qa_answer_votes FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert own votes"
  ON public.qa_answer_votes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own votes"
  ON public.qa_answer_votes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to auto-update useful_count on qa_answers
CREATE OR REPLACE FUNCTION public.update_answer_useful_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.qa_answers SET useful_count = useful_count + 1 WHERE id = NEW.answer_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.qa_answers SET useful_count = useful_count - 1 WHERE id = OLD.answer_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_update_answer_useful_count
AFTER INSERT OR DELETE ON public.qa_answer_votes
FOR EACH ROW EXECUTE FUNCTION public.update_answer_useful_count();
