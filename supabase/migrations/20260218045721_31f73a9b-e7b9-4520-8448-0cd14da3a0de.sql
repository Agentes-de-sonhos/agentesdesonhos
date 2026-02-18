
-- Playbook destinations
CREATE TABLE public.playbook_destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  image_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.playbook_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active playbook destinations"
  ON public.playbook_destinations FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can manage playbook destinations"
  ON public.playbook_destinations FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Playbook sections (one per tab per destination)
CREATE TABLE public.playbook_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  destination_id UUID NOT NULL REFERENCES public.playbook_destinations(id) ON DELETE CASCADE,
  tab_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content JSONB NOT NULL DEFAULT '{}',
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(destination_id, tab_key)
);

ALTER TABLE public.playbook_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view playbook sections"
  ON public.playbook_sections FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.playbook_destinations
    WHERE id = playbook_sections.destination_id AND is_active = true
  ));

CREATE POLICY "Admins can manage playbook sections"
  ON public.playbook_sections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Triggers for updated_at
CREATE TRIGGER update_playbook_destinations_updated_at
  BEFORE UPDATE ON public.playbook_destinations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_playbook_sections_updated_at
  BEFORE UPDATE ON public.playbook_sections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
