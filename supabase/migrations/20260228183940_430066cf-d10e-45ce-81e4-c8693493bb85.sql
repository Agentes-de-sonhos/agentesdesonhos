
CREATE TABLE public.trail_speakers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id UUID NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  photo_url TEXT,
  linkedin_url TEXT,
  whatsapp_number TEXT,
  email TEXT,
  bio TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.trail_speakers ENABLE ROW LEVEL SECURITY;

-- Everyone can read speakers
CREATE POLICY "Anyone can view trail speakers" ON public.trail_speakers
  FOR SELECT USING (true);

-- Only admins can manage speakers
CREATE POLICY "Admins can manage trail speakers" ON public.trail_speakers
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
