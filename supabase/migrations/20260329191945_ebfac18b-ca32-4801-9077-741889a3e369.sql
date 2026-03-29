
-- Tabela principal: companhias marítimas
CREATE TABLE public.companhias_maritimas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  tipo text NOT NULL DEFAULT 'Oceanico',
  categoria text NOT NULL DEFAULT 'Contemporaneo',
  subtipo text,
  descricao_curta text,
  logo_url text,
  website text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de regiões
CREATE TABLE public.regioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  ordem_exibicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de perfis de cliente
CREATE TABLE public.perfis_cliente (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  ordem_exibicao integer NOT NULL DEFAULT 0,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela relacional N:N companhias <-> regiões
CREATE TABLE public.companhias_maritimas_regioes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companhia_id uuid NOT NULL REFERENCES public.companhias_maritimas(id) ON DELETE CASCADE,
  regiao_id uuid NOT NULL REFERENCES public.regioes(id) ON DELETE CASCADE,
  UNIQUE(companhia_id, regiao_id)
);

-- Tabela relacional N:N companhias <-> perfis
CREATE TABLE public.companhias_maritimas_perfis (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  companhia_id uuid NOT NULL REFERENCES public.companhias_maritimas(id) ON DELETE CASCADE,
  perfil_id uuid NOT NULL REFERENCES public.perfis_cliente(id) ON DELETE CASCADE,
  UNIQUE(companhia_id, perfil_id)
);

-- RLS
ALTER TABLE public.companhias_maritimas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfis_cliente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companhias_maritimas_regioes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companhias_maritimas_perfis ENABLE ROW LEVEL SECURITY;

-- Políticas de leitura pública (dados de diretório)
CREATE POLICY "Leitura pública companhias" ON public.companhias_maritimas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura pública regioes" ON public.regioes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura pública perfis" ON public.perfis_cliente FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura pública companhias_regioes" ON public.companhias_maritimas_regioes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leitura pública companhias_perfis" ON public.companhias_maritimas_perfis FOR SELECT TO authenticated USING (true);

-- Políticas de escrita para admins
CREATE POLICY "Admin gerencia companhias" ON public.companhias_maritimas FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia regioes" ON public.regioes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia perfis" ON public.perfis_cliente FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia companhias_regioes" ON public.companhias_maritimas_regioes FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admin gerencia companhias_perfis" ON public.companhias_maritimas_perfis FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
CREATE TRIGGER update_companhias_maritimas_updated_at
  BEFORE UPDATE ON public.companhias_maritimas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Seed regiões
INSERT INTO public.regioes (nome, slug, ordem_exibicao) VALUES
  ('Caribe', 'caribe', 1),
  ('Mediterrâneo', 'mediterraneo', 2),
  ('Bahamas', 'bahamas', 3),
  ('Europa', 'europa', 4),
  ('Norte da Europa', 'norte-da-europa', 5),
  ('Alasca', 'alasca', 6),
  ('América do Sul', 'america-do-sul', 7),
  ('Antártida', 'antartida', 8),
  ('Ártico', 'artico', 9),
  ('Galápagos', 'galapagos', 10),
  ('Amazônia', 'amazonia', 11),
  ('Ásia', 'asia', 12),
  ('África', 'africa', 13),
  ('Egito', 'egito', 14),
  ('Grécia', 'grecia', 15),
  ('Polinésia', 'polinesia', 16),
  ('Global', 'global', 17),
  ('Volta ao Mundo', 'volta-ao-mundo', 18),
  ('Noruega', 'noruega', 19),
  ('América Latina', 'america-latina', 20);

-- Seed perfis de cliente
INSERT INTO public.perfis_cliente (nome, slug, ordem_exibicao) VALUES
  ('Família', 'familia', 1),
  ('Primeira viagem', 'primeira-viagem', 2),
  ('Entretenimento', 'entretenimento', 3),
  ('Flexível', 'flexivel', 4),
  ('Custo-benefício', 'custo-beneficio', 5),
  ('Casais', 'casais', 6),
  ('Sofisticado', 'sofisticado', 7),
  ('Sênior', 'senior', 8),
  ('Clássico', 'classico', 9),
  ('Gastronomia', 'gastronomia', 10),
  ('Cultural', 'cultural', 11),
  ('Imersão cultural', 'imersao-cultural', 12),
  ('Alto luxo', 'alto-luxo', 13),
  ('All inclusive', 'all-inclusive', 14),
  ('Luxo moderno', 'luxo-moderno', 15),
  ('Exclusivo', 'exclusivo', 16),
  ('Premium acessível', 'premium-acessivel', 17),
  ('Cultural guiado', 'cultural-guiado', 18),
  ('Explorador luxo', 'explorador-luxo', 19),
  ('Luxo aventura', 'luxo-aventura', 20),
  ('Boutique luxo', 'boutique-luxo', 21),
  ('Sustentável luxo', 'sustentavel-luxo', 22),
  ('Aventura', 'aventura', 23),
  ('Acesso rápido', 'acesso-rapido', 24),
  ('Explorador', 'explorador', 25),
  ('Experiência única', 'experiencia-unica', 26),
  ('Privativo', 'privativo', 27),
  ('Destino específico', 'destino-especifico', 28),
  ('Natureza', 'natureza', 29),
  ('Disney', 'disney', 30),
  ('Ultra luxo', 'ultra-luxo', 31);
