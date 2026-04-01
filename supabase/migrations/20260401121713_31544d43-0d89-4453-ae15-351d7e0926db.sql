
-- Table to store monthly phrases (admin-editable)
CREATE TABLE public.monthly_phrases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  phrase text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(month)
);

ALTER TABLE public.monthly_phrases ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can read
CREATE POLICY "Authenticated users can read monthly phrases"
  ON public.monthly_phrases FOR SELECT TO authenticated
  USING (true);

-- Only admins can manage
CREATE POLICY "Admins can manage monthly phrases"
  ON public.monthly_phrases FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Insert default phrases
INSERT INTO public.monthly_phrases (month, phrase) VALUES
  (1, 'Um novo começo, novas metas e infinitas possibilidades. Faça deste mês o início de algo incrível!'),
  (2, 'Mês de leveza e alegria — siga com energia positiva e aproveite cada oportunidade!'),
  (3, 'Tempo de crescimento e renovação. Plante boas sementes e colha grandes conquistas!'),
  (4, 'Que este mês traga equilíbrio, clareza e novas oportunidades para evoluir!'),
  (5, 'Mês de florescer: cuide dos seus sonhos e veja-os ganhar vida!'),
  (6, 'Metade do ano já chegou — é hora de acelerar e conquistar ainda mais!'),
  (7, 'Recarregue suas energias e volte ainda mais forte para alcançar seus objetivos!'),
  (8, 'Mês de foco e determinação — grandes resultados começam com pequenas ações!'),
  (9, 'Primavera de ideias: renove seus planos e faça-os florescer!'),
  (10, 'Mês de expansão — pense grande, aja com coragem e evolua!'),
  (11, 'Hora de consolidar conquistas e preparar um fechamento de ano incrível!'),
  (12, 'Celebre suas vitórias e finalize o ano com orgulho e gratidão!');

-- Table to track when each user last saw the monthly popup
CREATE TABLE public.monthly_popup_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_month integer NOT NULL,
  viewed_year integer NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, viewed_month, viewed_year)
);

ALTER TABLE public.monthly_popup_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own monthly popup views"
  ON public.monthly_popup_views FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own monthly popup views"
  ON public.monthly_popup_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
