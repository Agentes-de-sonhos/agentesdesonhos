
-- Benefits table
CREATE TABLE public.benefits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  company_name TEXT NOT NULL,
  company_logo_url TEXT,
  title TEXT NOT NULL,
  short_description TEXT,
  full_description TEXT,
  destination TEXT,
  category TEXT NOT NULL DEFAULT 'outro',
  tags TEXT[] DEFAULT '{}',
  requirements TEXT,
  how_to_claim TEXT,
  official_link TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  is_active BOOLEAN NOT NULL DEFAULT true,
  confirmations_count INTEGER NOT NULL DEFAULT 0,
  not_available_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Confirmations table
CREATE TABLE public.benefit_confirmations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  benefit_id UUID REFERENCES public.benefits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  confirmation_type TEXT NOT NULL DEFAULT 'works',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(benefit_id, user_id)
);

-- Comments table
CREATE TABLE public.benefit_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  benefit_id UUID REFERENCES public.benefits(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_confirmations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benefit_comments ENABLE ROW LEVEL SECURITY;

-- Benefits policies
CREATE POLICY "Anyone authenticated can view active benefits" ON public.benefits FOR SELECT TO authenticated USING (is_active = true);
CREATE POLICY "Users can insert benefits" ON public.benefits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own benefits" ON public.benefits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can manage all benefits" ON public.benefits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Confirmations policies
CREATE POLICY "Anyone authenticated can view confirmations" ON public.benefit_confirmations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert confirmations" ON public.benefit_confirmations FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own confirmations" ON public.benefit_confirmations FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Comments policies
CREATE POLICY "Anyone authenticated can view comments" ON public.benefit_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert comments" ON public.benefit_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own comments" ON public.benefit_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Function to update confirmation counts
CREATE OR REPLACE FUNCTION public.update_benefit_confirmation_counts()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.confirmation_type = 'works' THEN
      UPDATE public.benefits SET confirmations_count = confirmations_count + 1, updated_at = now() WHERE id = NEW.benefit_id;
    ELSE
      UPDATE public.benefits SET not_available_count = not_available_count + 1, updated_at = now() WHERE id = NEW.benefit_id;
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    IF OLD.confirmation_type = 'works' THEN
      UPDATE public.benefits SET confirmations_count = GREATEST(confirmations_count - 1, 0), updated_at = now() WHERE id = OLD.benefit_id;
    ELSE
      UPDATE public.benefits SET not_available_count = GREATEST(not_available_count - 1, 0), updated_at = now() WHERE id = OLD.benefit_id;
    END IF;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER update_benefit_counts
AFTER INSERT OR DELETE ON public.benefit_confirmations
FOR EACH ROW EXECUTE FUNCTION public.update_benefit_confirmation_counts();
