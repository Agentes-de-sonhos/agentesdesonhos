
CREATE TABLE public.vitrine_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.vitrine_categories ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read
CREATE POLICY "Anyone can view vitrine categories"
ON public.vitrine_categories FOR SELECT
TO authenticated
USING (true);

-- Only admins can insert
CREATE POLICY "Admins can create vitrine categories"
ON public.vitrine_categories FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Only admins can update
CREATE POLICY "Admins can update vitrine categories"
ON public.vitrine_categories FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Only admins can delete
CREATE POLICY "Admins can delete vitrine categories"
ON public.vitrine_categories FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_vitrine_categories_updated_at
BEFORE UPDATE ON public.vitrine_categories
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial categories
INSERT INTO public.vitrine_categories (name, order_index, created_by)
VALUES
  ('Cruzeiros', 0, '00000000-0000-0000-0000-000000000000'),
  ('Bloqueios Aéreos', 1, '00000000-0000-0000-0000-000000000000'),
  ('Pacotes', 2, '00000000-0000-0000-0000-000000000000'),
  ('Temporadas', 3, '00000000-0000-0000-0000-000000000000'),
  ('Promoções', 4, '00000000-0000-0000-0000-000000000000');
