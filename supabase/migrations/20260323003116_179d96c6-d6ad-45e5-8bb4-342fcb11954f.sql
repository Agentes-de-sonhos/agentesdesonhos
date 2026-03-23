
-- Categories table for client classification
CREATE TABLE public.client_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Subcategories table linked to categories
CREATE TABLE public.client_subcategories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  category_id UUID REFERENCES public.client_categories(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(name, category_id)
);

-- Add category/subcategory to clients
ALTER TABLE public.clients ADD COLUMN category_id UUID REFERENCES public.client_categories(id) ON DELETE SET NULL;
ALTER TABLE public.clients ADD COLUMN subcategory_id UUID REFERENCES public.client_subcategories(id) ON DELETE SET NULL;

-- RLS for categories (readable by all authenticated, manageable by admin)
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read categories" ON public.client_categories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can manage categories" ON public.client_categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- RLS for subcategories (readable by all authenticated, creatable by authenticated)
ALTER TABLE public.client_subcategories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can read subcategories" ON public.client_subcategories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can create subcategories" ON public.client_subcategories FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Admins can manage subcategories" ON public.client_subcategories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_clients_category_id ON public.clients(category_id);
CREATE INDEX idx_clients_subcategory_id ON public.clients(subcategory_id);
CREATE INDEX idx_client_subcategories_category_id ON public.client_subcategories(category_id);

-- Seed default categories
INSERT INTO public.client_categories (name, order_index) VALUES
  ('Agente de Viagens', 1),
  ('Operadora de Turismo', 2),
  ('Consolidadora', 3),
  ('Companhia Aérea', 4),
  ('Hotelaria', 5),
  ('Locadora de Veículos', 6),
  ('Cruzeiros', 7),
  ('Seguro Viagem', 8),
  ('Parques e Atrações', 9),
  ('Receptivo', 10),
  ('Guias', 11);
