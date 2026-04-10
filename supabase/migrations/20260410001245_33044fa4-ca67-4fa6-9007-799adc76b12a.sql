
CREATE TABLE public.academy_destinations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.academy_destinations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON public.academy_destinations
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated read" ON public.academy_destinations
  FOR SELECT TO authenticated USING (true);

INSERT INTO public.academy_destinations (name) VALUES
  ('Orlando'),('Nova York'),('Miami'),('Paris'),('Londres'),('Roma'),
  ('Caribe'),('Cancún'),('Punta Cana'),('Buenos Aires'),('Santiago'),
  ('Dubai'),('Europa'),('Ásia'),('Disney'),('Cruzeiros'),('Destinos Premium');
