-- Fase 1A: fluxo unificado de conversão file → operação + venda (atrás do entitlement
-- 'unified_workflow_v2', OFF por padrão). Tudo aditivo e nullable; nenhum dado
-- existente é alterado, nenhuma coluna/tabela é removida.

-- ============ operations ============
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS travel_file_id uuid,
  ADD COLUMN IF NOT EXISTS conversion_key text,
  ADD COLUMN IF NOT EXISTS flow_origin text,
  ADD COLUMN IF NOT EXISTS customer_payment_status text NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS supplier_payment_status text NOT NULL DEFAULT 'pendente';

ALTER TABLE public.operations
  ADD CONSTRAINT operations_travel_file_id_fkey
  FOREIGN KEY (travel_file_id) REFERENCES public.travel_files(id) ON DELETE SET NULL;

ALTER TABLE public.operations
  ADD CONSTRAINT operations_customer_payment_status_check
  CHECK (customer_payment_status IN ('pendente','parcial','pago')) NOT VALID;
ALTER TABLE public.operations
  ADD CONSTRAINT operations_supplier_payment_status_check
  CHECK (supplier_payment_status IN ('pendente','parcial','pago')) NOT VALID;

-- ============ sales ============
ALTER TABLE public.sales
  ADD COLUMN IF NOT EXISTS travel_file_id uuid,
  ADD COLUMN IF NOT EXISTS conversion_key text,
  ADD COLUMN IF NOT EXISTS flow_origin text;

ALTER TABLE public.sales
  ADD CONSTRAINT sales_travel_file_id_fkey
  FOREIGN KEY (travel_file_id) REFERENCES public.travel_files(id) ON DELETE SET NULL;

-- ============ operation_services ============
ALTER TABLE public.operation_services
  ADD COLUMN IF NOT EXISTS source_travel_file_service_id uuid;

ALTER TABLE public.operation_services
  ADD CONSTRAINT operation_services_source_tfs_fkey
  FOREIGN KEY (source_travel_file_service_id) REFERENCES public.travel_file_services(id) ON DELETE SET NULL;

-- ============ sale_products ============
ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS source_travel_file_service_id uuid,
  ADD COLUMN IF NOT EXISTS source_operation_service_id uuid;

ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_source_tfs_fkey
  FOREIGN KEY (source_travel_file_service_id) REFERENCES public.travel_file_services(id) ON DELETE SET NULL;
ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_source_os_fkey
  FOREIGN KEY (source_operation_service_id) REFERENCES public.operation_services(id) ON DELETE SET NULL;

-- ============ travel_files ============
ALTER TABLE public.travel_files
  ADD COLUMN IF NOT EXISTS workflow_version smallint NOT NULL DEFAULT 1;
COMMENT ON COLUMN public.travel_files.workflow_version IS
  '1 = fluxo legado; 2 = convertido pelo fluxo unificado (confirm_travel_file_sale).';
COMMENT ON COLUMN public.travel_files.operation_id IS
  'DEPRECATED: compatibilidade temporária. A leitura nova usa operations.travel_file_id. A RPC faz dual-write enquanto a transição durar.';

-- ============ travel_file_services: snapshot da regra financeira confirmada ============
ALTER TABLE public.travel_file_services
  ADD COLUMN IF NOT EXISTS operator_id uuid,
  ADD COLUMN IF NOT EXISTS commission_type text,
  ADD COLUMN IF NOT EXISTS commission_percent numeric,
  ADD COLUMN IF NOT EXISTS commission_fixed numeric,
  ADD COLUMN IF NOT EXISTS non_commissionable_fees numeric,
  ADD COLUMN IF NOT EXISTS payment_rule text,
  ADD COLUMN IF NOT EXISTS payment_days integer,
  ADD COLUMN IF NOT EXISTS requires_invoice boolean,
  ADD COLUMN IF NOT EXISTS financial_rule_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS financial_rule_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS financial_rule_snapshot_at timestamptz;

ALTER TABLE public.travel_file_services
  ADD CONSTRAINT travel_file_services_operator_id_fkey
  FOREIGN KEY (operator_id) REFERENCES public.tour_operators(id) ON DELETE SET NULL;

ALTER TABLE public.travel_file_services
  ADD CONSTRAINT travel_file_services_financial_rule_status_check
  CHECK (financial_rule_status IN ('pending','confirmed','not_applicable')) NOT VALID;

-- ============ Travas de unicidade (índices únicos parciais) ============
-- Uma operação por file e vice-versa.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_operations_travel_file
  ON public.operations (travel_file_id) WHERE travel_file_id IS NOT NULL;
-- Uma venda por file e vice-versa.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sales_travel_file
  ON public.sales (travel_file_id) WHERE travel_file_id IS NOT NULL;
-- Chave de conversão determinística por agência (V2: file:<id>; legado: opportunity:<id>).
CREATE UNIQUE INDEX IF NOT EXISTS uniq_operations_conversion_key
  ON public.operations (user_id, conversion_key) WHERE conversion_key IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sales_conversion_key
  ON public.sales (user_id, conversion_key) WHERE conversion_key IS NOT NULL;
-- Linhagem por serviço: um serviço do file vira no máximo um serviço da operação
-- e um produto financeiro.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_operation_services_file_service
  ON public.operation_services (source_travel_file_service_id) WHERE source_travel_file_service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sale_products_file_service
  ON public.sale_products (source_travel_file_service_id) WHERE source_travel_file_service_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_sale_products_operation_service
  ON public.sale_products (source_operation_service_id) WHERE source_operation_service_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operations_travel_file ON public.operations (travel_file_id) WHERE travel_file_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sales_travel_file ON public.sales (travel_file_id) WHERE travel_file_id IS NOT NULL;

-- ============ Tabela de comandos/idempotência ============
-- Sem GRANT para anon/authenticated e sem policies: só funções SECURITY DEFINER
-- acessam. É o registro de replay da confirmação de venda.
CREATE TABLE IF NOT EXISTS public.workflow_commands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  file_id uuid NOT NULL REFERENCES public.travel_files(id) ON DELETE CASCADE,
  command text NOT NULL,
  idempotency_key text NOT NULL,
  payload_hash text NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  result jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (file_id, command, idempotency_key)
);
GRANT ALL ON public.workflow_commands TO service_role;
ALTER TABLE public.workflow_commands ENABLE ROW LEVEL SECURITY;

-- ============ Fila de issues de reconciliação ============
-- Se a criação automática do file falhar, a solicitação do site nunca pode
-- sumir: o erro cai aqui para observação/retry, sem bloquear a solicitação.
CREATE TABLE IF NOT EXISTS public.booking_request_issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  agency_id uuid,
  source text NOT NULL DEFAULT 'ensure_travel_file',
  error_message text,
  payload jsonb,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.booking_request_issues TO service_role;
ALTER TABLE public.booking_request_issues ENABLE ROW LEVEL SECURITY;