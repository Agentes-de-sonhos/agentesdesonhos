-- 1. Toggle de visibilidade pública do perfil do parceiro
ALTER TABLE public.tour_operators
  ADD COLUMN IF NOT EXISTS is_public_visible boolean NOT NULL DEFAULT true;

-- 2. Enums para Agenda do Trade
DO $$ BEGIN
  CREATE TYPE public.trade_event_status AS ENUM ('pendente','aprovado','recusado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trade_event_type AS ENUM (
    'treinamento','evento','roadshow','live','famtour','reuniao','capacitacao','encontro','outro'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 3. Tabela de eventos da Agenda do Trade
CREATE TABLE IF NOT EXISTS public.trade_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_user_id uuid NOT NULL,
  operator_id uuid REFERENCES public.tour_operators(id) ON DELETE SET NULL,
  title text NOT NULL,
  description text,
  event_type public.trade_event_type NOT NULL DEFAULT 'evento',
  start_at timestamptz NOT NULL,
  end_at timestamptz,
  location text,
  link text,
  cover_url text,
  status public.trade_event_status NOT NULL DEFAULT 'pendente',
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trade_events_supplier ON public.trade_events(supplier_user_id);
CREATE INDEX IF NOT EXISTS idx_trade_events_status ON public.trade_events(status);
CREATE INDEX IF NOT EXISTS idx_trade_events_start_at ON public.trade_events(start_at);

ALTER TABLE public.trade_events ENABLE ROW LEVEL SECURITY;

-- Fornecedor: acesso completo apenas aos próprios eventos
CREATE POLICY "Suppliers manage own trade events"
ON public.trade_events
FOR ALL
TO authenticated
USING (auth.uid() = supplier_user_id)
WITH CHECK (auth.uid() = supplier_user_id);

-- Admin: acesso total
CREATE POLICY "Admins manage all trade events"
ON public.trade_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Demais usuários autenticados: apenas SELECT de eventos aprovados
CREATE POLICY "Authenticated users view approved trade events"
ON public.trade_events
FOR SELECT
TO authenticated
USING (status = 'aprovado');

-- Trigger updated_at
DROP TRIGGER IF EXISTS trg_trade_events_updated_at ON public.trade_events;
CREATE TRIGGER trg_trade_events_updated_at
BEFORE UPDATE ON public.trade_events
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();