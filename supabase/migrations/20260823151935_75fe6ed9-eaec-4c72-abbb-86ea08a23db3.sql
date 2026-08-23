-- 1) Visibilidade explícita de anexos de operação na Área do Cliente
ALTER TABLE public.operation_attachments
  ADD COLUMN IF NOT EXISTS client_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_visible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_visible_by UUID;

CREATE INDEX IF NOT EXISTS idx_operation_attachments_client_visible
  ON public.operation_attachments(operation_id) WHERE client_visible;

-- 2) Visibilidade explícita de contratos na Área do Cliente
ALTER TABLE public.sale_contracts
  ADD COLUMN IF NOT EXISTS client_visible BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS client_visible_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS client_visible_by UUID;

CREATE INDEX IF NOT EXISTS idx_sale_contracts_client_visible
  ON public.sale_contracts(sale_id) WHERE client_visible;

-- 3) Autorizações de uso único para abrir a Carteira Digital vinculada
CREATE TABLE IF NOT EXISTS public.client_area_wallet_grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id UUID NOT NULL,
  account_id UUID NOT NULL REFERENCES public.client_area_accounts(id) ON DELETE CASCADE,
  client_id UUID NOT NULL,
  operation_id UUID,
  trip_id UUID NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT ALL ON public.client_area_wallet_grants TO service_role;

ALTER TABLE public.client_area_wallet_grants ENABLE ROW LEVEL SECURITY;
-- Nenhuma policy: tabela acessível somente pelo servidor (service_role).

CREATE INDEX IF NOT EXISTS idx_client_area_wallet_grants_lookup
  ON public.client_area_wallet_grants(token_hash);
CREATE INDEX IF NOT EXISTS idx_client_area_wallet_grants_expiry
  ON public.client_area_wallet_grants(expires_at);