-- Create learning_trails table (destination-based learning paths)
CREATE TABLE public.learning_trails (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  destination TEXT NOT NULL,
  image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trainings table (courses/videos linked to trails)
CREATE TABLE public.trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'geral',
  training_type TEXT NOT NULL DEFAULT 'recorded', -- 'live' or 'recorded'
  video_url TEXT,
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  thumbnail_url TEXT,
  materials_url TEXT,
  instructor TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE, -- for live trainings
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trail_trainings junction table (many-to-many relationship)
CREATE TABLE public.trail_trainings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id UUID NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trail_id, training_id)
);

-- Create user_training_progress table (track user progress)
CREATE TABLE public.user_training_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  training_id UUID NOT NULL REFERENCES public.trainings(id) ON DELETE CASCADE,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  watched_minutes INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, training_id)
);

-- Create user_certificates table (certificates for completed trails)
CREATE TABLE public.user_certificates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  trail_id UUID NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  agent_name TEXT NOT NULL,
  issued_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  certificate_number TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, trail_id)
);

-- Enable Row Level Security
ALTER TABLE public.learning_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trail_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_training_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_certificates ENABLE ROW LEVEL SECURITY;

-- RLS Policies for learning_trails (public read, admin write)
CREATE POLICY "Anyone can view active trails" ON public.learning_trails
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage trails" ON public.learning_trails
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trainings (public read, admin write)
CREATE POLICY "Anyone can view active trainings" ON public.trainings
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage trainings" ON public.trainings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for trail_trainings (public read, admin write)
CREATE POLICY "Anyone can view trail trainings" ON public.trail_trainings
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage trail trainings" ON public.trail_trainings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for user_training_progress (user owns their progress)
CREATE POLICY "Users can view their own progress" ON public.user_training_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own progress" ON public.user_training_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own progress" ON public.user_training_progress
  FOR UPDATE USING (auth.uid() = user_id);

-- Allow users to view all progress for ranking (anonymized)
CREATE POLICY "Anyone can view progress for ranking" ON public.user_training_progress
  FOR SELECT USING (true);

-- RLS Policies for user_certificates
CREATE POLICY "Users can view their own certificates" ON public.user_certificates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own certificates" ON public.user_certificates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Allow public viewing of certificates for ranking
CREATE POLICY "Anyone can view certificates for ranking" ON public.user_certificates
  FOR SELECT USING (true);

-- Create indexes for performance
CREATE INDEX idx_trainings_category ON public.trainings(category);
CREATE INDEX idx_trainings_type ON public.trainings(training_type);
CREATE INDEX idx_trainings_scheduled ON public.trainings(scheduled_at) WHERE scheduled_at IS NOT NULL;
CREATE INDEX idx_trail_trainings_trail ON public.trail_trainings(trail_id);
CREATE INDEX idx_trail_trainings_training ON public.trail_trainings(training_id);
CREATE INDEX idx_user_progress_user ON public.user_training_progress(user_id);
CREATE INDEX idx_user_progress_training ON public.user_training_progress(training_id);
CREATE INDEX idx_user_certificates_user ON public.user_certificates(user_id);

-- Add update triggers
CREATE TRIGGER update_learning_trails_updated_at
  BEFORE UPDATE ON public.learning_trails
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trainings_updated_at
  BEFORE UPDATE ON public.trainings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_training_progress_updated_at
  BEFORE UPDATE ON public.user_training_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();