
-- Templates table: reusable itinerary skeleton metadata
CREATE TABLE public.itinerary_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  destination TEXT,
  cover_image_url TEXT,
  nights_count INTEGER NOT NULL DEFAULT 0,
  style TEXT NOT NULL DEFAULT 'moderado',
  profile TEXT NOT NULL DEFAULT 'casal',
  pace TEXT NOT NULL DEFAULT 'moderado',
  tags TEXT[] NOT NULL DEFAULT '{}',
  interests TEXT[] NOT NULL DEFAULT '{}',
  destination_intro_text TEXT,
  destination_intro_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  additional_preferences JSONB NOT NULL DEFAULT '{}'::jsonb,
  source_itinerary_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_templates TO authenticated;
GRANT ALL ON public.itinerary_templates TO service_role;

ALTER TABLE public.itinerary_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own templates" ON public.itinerary_templates
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own templates" ON public.itinerary_templates
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own templates" ON public.itinerary_templates
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users delete own templates" ON public.itinerary_templates
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER trg_itinerary_templates_updated_at
  BEFORE UPDATE ON public.itinerary_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_itinerary_templates_user_id ON public.itinerary_templates(user_id);

-- Template activities: flat structure, no dates
CREATE TABLE public.itinerary_template_activities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  template_id UUID NOT NULL REFERENCES public.itinerary_templates(id) ON DELETE CASCADE,
  day_number INTEGER NOT NULL,
  period TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT,
  estimated_duration TEXT,
  estimated_cost TEXT,
  photo_url TEXT,
  category TEXT,
  priority TEXT NOT NULL DEFAULT 'essencial',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itinerary_template_activities TO authenticated;
GRANT ALL ON public.itinerary_template_activities TO service_role;

ALTER TABLE public.itinerary_template_activities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own template activities" ON public.itinerary_template_activities
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Users insert own template activities" ON public.itinerary_template_activities
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Users update own template activities" ON public.itinerary_template_activities
  FOR UPDATE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.user_id = auth.uid())
  );
CREATE POLICY "Users delete own template activities" ON public.itinerary_template_activities
  FOR DELETE TO authenticated USING (
    EXISTS (SELECT 1 FROM public.itinerary_templates t WHERE t.id = template_id AND t.user_id = auth.uid())
  );

CREATE INDEX idx_template_activities_template_id ON public.itinerary_template_activities(template_id);
CREATE INDEX idx_template_activities_day ON public.itinerary_template_activities(template_id, day_number, period, order_index);
