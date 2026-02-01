-- Create mentorships table
CREATE TABLE public.mentorships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  mentor_name TEXT NOT NULL,
  mentor_photo_url TEXT,
  specialty TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  target_audience TEXT,
  objectives TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentorship meetings table
CREATE TABLE public.mentorship_meetings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  meeting_date TIMESTAMP WITH TIME ZONE NOT NULL,
  meeting_url TEXT,
  recording_url TEXT,
  is_past BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentorship videos table
CREATE TABLE public.mentorship_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  duration_minutes INTEGER DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentorship modules table
CREATE TABLE public.mentorship_modules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentorship lessons table
CREATE TABLE public.mentorship_lessons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  module_id UUID NOT NULL REFERENCES public.mentorship_modules(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  video_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create mentorship materials table
CREATE TABLE public.mentorship_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  mentorship_id UUID NOT NULL REFERENCES public.mentorships(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT DEFAULT 'pdf',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.mentorships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mentorship_materials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for mentorships (admin can manage, all authenticated can view)
CREATE POLICY "Admins can manage mentorships" ON public.mentorships
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view active mentorships" ON public.mentorships
  FOR SELECT USING (auth.role() = 'authenticated' AND is_active = true);

-- RLS Policies for mentorship_meetings
CREATE POLICY "Admins can manage meetings" ON public.mentorship_meetings
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view meetings" ON public.mentorship_meetings
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for mentorship_videos
CREATE POLICY "Admins can manage videos" ON public.mentorship_videos
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view videos" ON public.mentorship_videos
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for mentorship_modules
CREATE POLICY "Admins can manage modules" ON public.mentorship_modules
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view modules" ON public.mentorship_modules
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for mentorship_lessons
CREATE POLICY "Admins can manage lessons" ON public.mentorship_lessons
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view lessons" ON public.mentorship_lessons
  FOR SELECT USING (auth.role() = 'authenticated');

-- RLS Policies for mentorship_materials
CREATE POLICY "Admins can manage materials" ON public.mentorship_materials
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can view materials" ON public.mentorship_materials
  FOR SELECT USING (auth.role() = 'authenticated');

-- Create triggers for updated_at
CREATE TRIGGER update_mentorships_updated_at
  BEFORE UPDATE ON public.mentorships
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_meetings_updated_at
  BEFORE UPDATE ON public.mentorship_meetings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_videos_updated_at
  BEFORE UPDATE ON public.mentorship_videos
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_modules_updated_at
  BEFORE UPDATE ON public.mentorship_modules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_lessons_updated_at
  BEFORE UPDATE ON public.mentorship_lessons
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_mentorship_materials_updated_at
  BEFORE UPDATE ON public.mentorship_materials
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert initial mentorship: Mentoria Nobre
INSERT INTO public.mentorships (name, mentor_name, specialty, short_description, full_description, target_audience, objectives)
VALUES (
  'Mentoria Nobre',
  'Nobre Digital Hub',
  'Gestão e Marketing Digital',
  'Programa exclusivo de mentoria para agentes de viagens que desejam elevar seu negócio ao próximo nível.',
  'A Mentoria Nobre é um programa completo desenvolvido para agentes de viagens que buscam crescimento profissional, domínio de ferramentas digitais e estratégias avançadas de vendas. Com encontros semanais ao vivo, conteúdos exclusivos e materiais práticos, você terá todo o suporte necessário para transformar sua carreira.',
  'Agentes de viagens que desejam profissionalizar seu negócio, aumentar vendas e dominar o marketing digital.',
  'Capacitar agentes de viagens com conhecimentos práticos em gestão, marketing digital, vendas e atendimento ao cliente de alta performance.'
);