
-- Add fields to learning_trails
ALTER TABLE public.learning_trails 
  ADD COLUMN IF NOT EXISTS total_hours numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS certificate_template_url text;

-- Quiz questions per training module
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quiz questions" ON public.quiz_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view quiz questions" ON public.quiz_questions FOR SELECT USING (auth.role() = 'authenticated');

-- Quiz answer options
CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage quiz options" ON public.quiz_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view quiz options" ON public.quiz_options FOR SELECT USING (auth.role() = 'authenticated');

-- User quiz attempts per module
CREATE TABLE public.user_quiz_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  training_id uuid NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own quiz attempts" ON public.user_quiz_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own quiz attempts" ON public.user_quiz_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trail final exam questions
CREATE TABLE public.trail_exam_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  question_text text NOT NULL,
  question_type text NOT NULL DEFAULT 'multiple_choice',
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trail_exam_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam questions" ON public.trail_exam_questions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view exam questions" ON public.trail_exam_questions FOR SELECT USING (auth.role() = 'authenticated');

-- Trail final exam options
CREATE TABLE public.trail_exam_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES public.trail_exam_questions(id) ON DELETE CASCADE,
  option_text text NOT NULL,
  is_correct boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trail_exam_options ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage exam options" ON public.trail_exam_options FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view exam options" ON public.trail_exam_options FOR SELECT USING (auth.role() = 'authenticated');

-- User final exam attempts
CREATE TABLE public.user_exam_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  trail_id uuid NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  score integer NOT NULL DEFAULT 0,
  passed boolean NOT NULL DEFAULT false,
  answers jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_exam_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own exam attempts" ON public.user_exam_attempts FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own exam attempts" ON public.user_exam_attempts FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Trail materials (complementary, with premium lock)
CREATE TABLE public.trail_materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trail_id uuid NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  material_type text NOT NULL DEFAULT 'pdf',
  category text NOT NULL DEFAULT 'geral',
  file_url text,
  is_premium boolean NOT NULL DEFAULT false,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.trail_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trail materials" ON public.trail_materials FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Authenticated can view trail materials" ON public.trail_materials FOR SELECT USING (auth.role() = 'authenticated');

-- Achievement definitions
CREATE TABLE public.achievement_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  icon text NOT NULL DEFAULT 'award',
  criteria_type text NOT NULL DEFAULT 'trails_completed',
  criteria_value integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.achievement_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage achievements" ON public.achievement_definitions FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Anyone can view achievements" ON public.achievement_definitions FOR SELECT USING (true);

-- User achievements
CREATE TABLE public.user_achievements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  achievement_id uuid NOT NULL REFERENCES public.achievement_definitions(id) ON DELETE CASCADE,
  earned_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own achievements" ON public.user_achievements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can earn achievements" ON public.user_achievements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Anyone can view achievements for ranking" ON public.user_achievements FOR SELECT USING (true);

-- Insert default achievement definitions
INSERT INTO public.achievement_definitions (name, description, icon, criteria_type, criteria_value) VALUES
  ('Primeira Trilha', 'Completou sua primeira trilha de aprendizado', 'trophy', 'trails_completed', 1),
  ('Explorador', 'Completou 3 trilhas de aprendizado', 'compass', 'trails_completed', 3),
  ('Especialista', 'Completou 5 trilhas de aprendizado', 'star', 'trails_completed', 5),
  ('Mestre Educatravel', 'Completou 10 trilhas de aprendizado', 'crown', 'trails_completed', 10),
  ('Top 10 Academy', 'Entrou no Top 10 do ranking geral', 'medal', 'ranking_top', 10),
  ('Nota Máxima', 'Obteve 100% em uma prova final', 'zap', 'perfect_score', 1);
