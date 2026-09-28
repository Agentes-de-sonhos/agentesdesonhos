CREATE TABLE public.traveler_visas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  traveler_id UUID NOT NULL REFERENCES public.travelers(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  tipo TEXT NOT NULL,
  numero TEXT,
  data_vencimento DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_traveler_visas_traveler ON public.traveler_visas(traveler_id);
CREATE INDEX idx_traveler_visas_user_venc ON public.traveler_visas(user_id, data_vencimento);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.traveler_visas TO authenticated;
GRANT ALL ON public.traveler_visas TO service_role;

ALTER TABLE public.traveler_visas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own traveler visas"
ON public.traveler_visas
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_traveler_visas_updated_at
BEFORE UPDATE ON public.traveler_visas
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();