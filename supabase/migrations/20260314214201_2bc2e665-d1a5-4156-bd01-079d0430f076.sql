
CREATE TABLE public.qa_answer_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  answer_id UUID REFERENCES public.qa_answers(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (answer_id, user_id)
);

ALTER TABLE public.qa_answer_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all likes" ON public.qa_answer_likes
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can insert own likes" ON public.qa_answer_likes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own likes" ON public.qa_answer_likes
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.qa_answer_likes;
