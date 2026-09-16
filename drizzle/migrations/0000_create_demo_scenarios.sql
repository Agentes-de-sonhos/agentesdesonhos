-- Fundação segura dos cenários demonstrativos (Etapa 1).
-- Somente tenants explicitamente marcados aqui podem receber automações de demo
-- (ex.: atualização relativa de datas). Nenhum dado existente é alterado.

CREATE TABLE public.demo_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  label TEXT,
  hostname TEXT,
  is_demo BOOLEAN NOT NULL DEFAULT true,
  dates_shifted_on DATE,
  dates_locked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_demo_scenarios_user ON public.demo_scenarios (user_id);

GRANT SELECT ON public.demo_scenarios TO authenticated;
GRANT ALL ON public.demo_scenarios TO service_role;

ALTER TABLE public.demo_scenarios ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads own demo scenarios"
  ON public.demo_scenarios FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins read demo scenarios"
  ON public.demo_scenarios FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Mapa auditável: cada registro fictício pertencente a um cenário.
CREATE TABLE public.demo_scenario_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES public.demo_scenarios(id) ON DELETE CASCADE,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  record_role TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (scenario_id, table_name, record_id)
);

CREATE INDEX idx_demo_scenario_records_scenario ON public.demo_scenario_records (scenario_id, table_name);

GRANT SELECT ON public.demo_scenario_records TO authenticated;
GRANT ALL ON public.demo_scenario_records TO service_role;

ALTER TABLE public.demo_scenario_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant reads own demo scenario records"
  ON public.demo_scenario_records FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.demo_scenarios s
    WHERE s.id = demo_scenario_records.scenario_id AND s.user_id = auth.uid()
  ));

CREATE POLICY "Admins read demo scenario records"
  ON public.demo_scenario_records FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Guarda usada por qualquer automação de demonstração.
CREATE OR REPLACE FUNCTION public.is_demo_scenario_tenant(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.demo_scenarios
    WHERE user_id = _user_id AND is_demo = true
  )
$$;