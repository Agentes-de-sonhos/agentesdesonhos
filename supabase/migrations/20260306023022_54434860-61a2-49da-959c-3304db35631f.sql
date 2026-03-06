
-- Q&A Questions table
CREATE TABLE public.qa_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  category text NOT NULL DEFAULT 'geral',
  is_resolved boolean NOT NULL DEFAULT false,
  answers_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_questions ENABLE ROW LEVEL SECURITY;

-- Premium users can view all questions
CREATE POLICY "Premium users can view questions" ON public.qa_questions
  FOR SELECT TO authenticated USING (true);

-- Premium users can create questions (feature check done in app)
CREATE POLICY "Authenticated users can create questions" ON public.qa_questions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own questions
CREATE POLICY "Users can update own questions" ON public.qa_questions
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- Users can delete their own questions
CREATE POLICY "Users can delete own questions" ON public.qa_questions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Q&A Answers table
CREATE TABLE public.qa_answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.qa_questions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  is_best_answer boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.qa_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view answers" ON public.qa_answers
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create answers" ON public.qa_answers
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own answers" ON public.qa_answers
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own answers" ON public.qa_answers
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Gamification Points table
CREATE TABLE public.gamification_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  points integer NOT NULL DEFAULT 0,
  action text NOT NULL,
  reference_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.gamification_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all points for ranking" ON public.gamification_points
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can earn points" ON public.gamification_points
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Daily login tracking
CREATE TABLE public.gamification_daily_login (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  login_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, login_date)
);

ALTER TABLE public.gamification_daily_login ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own logins" ON public.gamification_daily_login
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can register login" ON public.gamification_daily_login
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Function to update answers_count
CREATE OR REPLACE FUNCTION public.update_qa_answers_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.qa_questions SET answers_count = answers_count + 1, updated_at = now() WHERE id = NEW.question_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.qa_questions SET answers_count = answers_count - 1, updated_at = now() WHERE id = OLD.question_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_qa_answers_count_trigger
  AFTER INSERT OR DELETE ON public.qa_answers
  FOR EACH ROW EXECUTE FUNCTION public.update_qa_answers_count();

-- Function to get gamification ranking
CREATE OR REPLACE FUNCTION public.get_gamification_ranking(limit_count integer DEFAULT 20)
RETURNS TABLE(user_id uuid, user_name text, avatar_url text, agency_name text, total_points bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    gp.user_id,
    COALESCE(p.name, 'Usuário') as user_name,
    p.avatar_url,
    p.agency_name,
    COALESCE(SUM(gp.points), 0)::bigint as total_points
  FROM gamification_points gp
  LEFT JOIN profiles p ON p.user_id = gp.user_id
  GROUP BY gp.user_id, p.name, p.avatar_url, p.agency_name
  ORDER BY total_points DESC
  LIMIT limit_count;
END;
$$;
