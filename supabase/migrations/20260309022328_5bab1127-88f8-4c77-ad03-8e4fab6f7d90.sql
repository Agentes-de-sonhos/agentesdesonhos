
CREATE TABLE public.menu_order (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  section text NOT NULL DEFAULT 'vender',
  item_key text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(section, item_key)
);

ALTER TABLE public.menu_order ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read the menu order
CREATE POLICY "Anyone can read menu order"
  ON public.menu_order FOR SELECT
  TO authenticated
  USING (true);

-- Only admins can modify
CREATE POLICY "Admins can manage menu order"
  ON public.menu_order FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Seed default order for vender section
INSERT INTO public.menu_order (section, item_key, order_index) VALUES
  ('vender', 'materiais', 0),
  ('vender', 'gerar-orcamento', 1),
  ('vender', 'ferramentas-ia', 2),
  ('vender', 'mentorias', 3),
  ('vender', 'cartao-digital', 4),
  ('vender', 'bloqueios-aereos', 5),
  ('vender', 'mapa-turismo', 6),
  ('vender', 'minha-vitrine', 7);
