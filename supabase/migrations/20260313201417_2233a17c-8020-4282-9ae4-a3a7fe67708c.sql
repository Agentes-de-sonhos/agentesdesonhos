
CREATE TABLE public.dashboard_banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.dashboard_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active banners" ON public.dashboard_banners
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage banners" ON public.dashboard_banners
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.dashboard_banners (title, description, image_url, button_text, button_link, order_index)
VALUES
  ('Bem-vindo ao Agente de Sonhos', 'A plataforma que conecta agentes de viagens, conhecimento e oportunidades do turismo.', NULL, 'Explorar plataforma', '/dashboard', 0),
  ('Educa Travel Academy', 'Aprenda sobre destinos, produtos e tendências do turismo com especialistas.', NULL, 'Ver treinamentos', '/educa-academy', 1),
  ('Participe da Comunidade', 'Tire dúvidas, compartilhe experiências e conecte-se com outros agentes de viagens.', NULL, 'Ir para a comunidade', '/perguntas-respostas', 2);
