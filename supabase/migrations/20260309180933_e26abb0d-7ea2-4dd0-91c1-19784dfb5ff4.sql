
CREATE TABLE public.academy_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.academy_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read settings
CREATE POLICY "Anyone can read academy settings" ON public.academy_settings
  FOR SELECT TO authenticated USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage academy settings" ON public.academy_settings
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default hero banner row
INSERT INTO public.academy_settings (key, value) VALUES ('hero_banner_url', null);
