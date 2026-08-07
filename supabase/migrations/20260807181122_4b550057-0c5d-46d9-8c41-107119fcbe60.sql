-- 1) Rename first operational stage
UPDATE public.operation_pipeline_stages
SET name = 'Confirmação do pagamento'
WHERE COALESCE(legacy_key, key) = 'venda_confirmada'
  AND name IN ('Pagamento Confirmado', 'Pagamento confirmado', 'Venda Confirmada');

CREATE OR REPLACE FUNCTION public.ensure_default_operation_stages(_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.operation_pipeline_stages WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.operation_pipeline_stages (user_id, key, name, color, position, legacy_key, is_protected) VALUES
    (_user_id, 'venda_confirmada', 'Confirmação do pagamento', 'emerald', 0, 'venda_confirmada', true),
    (_user_id, 'emissao',          'Emissão / Reservas',  'blue',    1, 'emissao', false),
    (_user_id, 'documentacao',     'Documentação',        'amber',   2, 'documentacao', false),
    (_user_id, 'entrega',          'Entrega da Viagem',   'violet',  3, 'entrega', false),
    (_user_id, 'pre_embarque',     'Pré-Embarque',        'orange',  4, 'pre_embarque', false),
    (_user_id, 'em_viagem',        'Em Viagem',           'sky',     5, 'em_viagem', false),
    (_user_id, 'pos_viagem',       'Pós-Viagem',          'fuchsia', 6, 'pos_viagem', false),
    (_user_id, 'finalizado',       'Finalizado',          'slate',   7, 'finalizado', true);
END;
$$;

-- 2) Automatic payment status from services
CREATE OR REPLACE FUNCTION public.compute_operation_payment_status(_operation_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH payable AS (
    SELECT s.is_paid
    FROM public.operation_services s
    WHERE s.operation_id = _operation_id
      AND COALESCE(s.amount, 0) > 0
      AND COALESCE(s.service_data->>'cancelled', 'false') <> 'true'
      AND LOWER(COALESCE(s.service_data->>'status', '')) NOT IN ('cancelado', 'cancelled', 'canceled')
  )
  SELECT CASE
    WHEN (SELECT count(*) FROM payable) = 0 THEN 'pendente'
    WHEN (SELECT count(*) FROM payable WHERE is_paid) = 0 THEN 'pendente'
    WHEN (SELECT count(*) FROM payable WHERE NOT is_paid) = 0 THEN 'pago'
    ELSE 'parcial'
  END;
$$;

CREATE OR REPLACE FUNCTION public.sync_operation_payment_status()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _op uuid := COALESCE(NEW.operation_id, OLD.operation_id);
  _status text;
BEGIN
  _status := public.compute_operation_payment_status(_op);
  UPDATE public.operations
  SET payment_status = _status
  WHERE id = _op AND payment_status IS DISTINCT FROM _status;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_operation_payment_status ON public.operation_services;
CREATE TRIGGER trg_sync_operation_payment_status
AFTER INSERT OR UPDATE OR DELETE ON public.operation_services
FOR EACH ROW EXECUTE FUNCTION public.sync_operation_payment_status();

GRANT EXECUTE ON FUNCTION public.compute_operation_payment_status(uuid) TO authenticated, service_role;

-- 3) Backfill existing operations (never assume paid)
UPDATE public.operations o
SET payment_status = public.compute_operation_payment_status(o.id)
WHERE o.payment_status IS DISTINCT FROM public.compute_operation_payment_status(o.id);