
-- Surveys table
CREATE TABLE public.surveys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  avatar_url TEXT,
  sender_name TEXT NOT NULL DEFAULT 'Fernando',
  empathy_after_question INTEGER,
  empathy_message TEXT DEFAULT 'Interessante… muitos agentes de viagens comentam exatamente isso também.',
  final_message TEXT DEFAULT 'Obrigado por responder! 🙏\nEstou finalizando uma nova plataforma para ajudar agentes de viagens a vender mais e trabalhar com mais eficiência.',
  gift_message TEXT DEFAULT 'Como agradecimento, preparei um presente para você.',
  gift_type TEXT DEFAULT 'link',
  gift_url TEXT,
  gift_file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Survey questions table
CREATE TABLE public.survey_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  question_type TEXT NOT NULL DEFAULT 'text',
  question_text TEXT,
  audio_url TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Survey responses table
CREATE TABLE public.survey_responses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  survey_id UUID NOT NULL REFERENCES public.surveys(id) ON DELETE CASCADE,
  session_id TEXT NOT NULL,
  answers JSONB NOT NULL DEFAULT '[]'::jsonb,
  contact_name TEXT,
  contact_info TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.surveys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

-- Surveys: public read for active, admin full access
CREATE POLICY "Anyone can read active surveys" ON public.surveys FOR SELECT USING (is_active = true);
CREATE POLICY "Admins can manage surveys" ON public.surveys FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Questions: public read, admin full access
CREATE POLICY "Anyone can read survey questions" ON public.survey_questions FOR SELECT USING (true);
CREATE POLICY "Admins can manage survey questions" ON public.survey_questions FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Responses: anyone can insert, admins can read
CREATE POLICY "Anyone can submit responses" ON public.survey_responses FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update own response" ON public.survey_responses FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Admins can read responses" ON public.survey_responses FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for survey files
INSERT INTO storage.buckets (id, name, public) VALUES ('survey-files', 'survey-files', true);

-- Storage policies for survey-files
CREATE POLICY "Anyone can read survey files" ON storage.objects FOR SELECT USING (bucket_id = 'survey-files');
CREATE POLICY "Admins can upload survey files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'survey-files' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can delete survey files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'survey-files' AND public.has_role(auth.uid(), 'admin'));
