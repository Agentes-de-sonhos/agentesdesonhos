
CREATE TABLE public.platform_updates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  release_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_updates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read platform updates"
  ON public.platform_updates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage platform updates"
  ON public.platform_updates
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
