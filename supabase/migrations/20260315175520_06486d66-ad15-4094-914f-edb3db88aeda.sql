
CREATE TABLE public.tour_operators (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text DEFAULT 'Operadoras de turismo',
  specialties text,
  how_to_sell text,
  sales_channels text,
  commercial_contacts text,
  website text,
  instagram text,
  founded_year integer,
  annual_revenue text,
  employees integer,
  executive_team text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX tour_operators_name_unique ON public.tour_operators (lower(trim(name)));

ALTER TABLE public.tour_operators ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read tour_operators"
ON public.tour_operators FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can insert tour_operators"
ON public.tour_operators FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update tour_operators"
ON public.tour_operators FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete tour_operators"
ON public.tour_operators FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
