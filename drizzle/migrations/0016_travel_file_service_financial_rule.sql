-- Fase 1A (regra financeira): termos padrão da agência e snapshot confirmado por serviço.

-- ============================================================
-- 1) Leitura dos termos padrão da agência para um operador
-- ============================================================
CREATE OR REPLACE FUNCTION public.travel_file_supplier_terms(_operator_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _agency_id uuid;
  _row public.agency_supplier_terms;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'AUTH_REQUIRED';
  END IF;
  SELECT COALESCE(p.agency_id, p.user_id) INTO _agency_id
  FROM public.profiles p WHERE p.user_id = _uid;
  IF _agency_id IS NULL THEN
    RAISE EXCEPTION 'AGENCY_NOT_FOUND';
  END IF;
  SELECT t.* INTO _row
  FROM public.agency_supplier_terms t
  WHERE t.agency_id = _agency_id AND t.operator_id = _operator_id
  LIMIT 1;
  IF _row.id IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN jsonb_build_object(
    'operator_id', _row.operator_id,
    'commission_type', _row.default_commission_type,
    'commission_percent', _row.default_commission_percent,
    'commission_fixed', _row.default_commission_fixed,
    'non_commissionable_fees', _row.default_non_commissionable_fees,
    'payment_rule', _row.payment_rule,
    'payment_days', _row.payment_days,
    'requires_invoice', _row.requires_invoice
  );
END;
$function$;

-- ============================================================
-- 2) Grava a regra financeira confirmada (snapshot) do serviço
-- ============================================================
CREATE OR REPLACE FUNCTION public.travel_file_service_set_financial_rule(
  _service_id uuid,
  _payload jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _service public.travel_file_services;
  _file public.travel_files;
  _status text;
  _commission_type text;
  _payment_rule text;
  _source text;
BEGIN
  SELECT * INTO _service FROM public.travel_file_services WHERE id = _service_id;
  IF _service.id IS NULL THEN
    RAISE EXCEPTION 'SERVICE_NOT_FOUND';
  END IF;
  _file := private.assert_travel_file_access(_service.file_id, 'reservations.financial.manage');
  -- Não edita regra de serviço já convertido para operação no fluxo V2.
  IF EXISTS (SELECT 1 FROM public.operation_services os
             WHERE os.source_travel_file_service_id = _service_id) THEN
    RAISE EXCEPTION 'ALREADY_CONVERTED: Este serviço já foi convertido para a operação. Ajuste financeiro deve ser feito no módulo financeiro.';
  END IF;

  _status := lower(coalesce(nullif(btrim(coalesce(_payload->>'status', '')), ''), 'confirmed'));
  IF _status NOT IN ('pending', 'confirmed', 'not_applicable') THEN
    RAISE EXCEPTION 'INVALID_RULE_STATUS';
  END IF;

  _commission_type := lower(nullif(btrim(coalesce(_payload->>'commission_type', '')), ''));
  IF _commission_type IS NOT NULL AND _commission_type NOT IN ('percentage', 'percent', 'fixed', 'none') THEN
    RAISE EXCEPTION 'INVALID_COMMISSION_TYPE';
  END IF;

  _payment_rule := lower(nullif(btrim(coalesce(_payload->>'payment_rule', '')), ''));
  _source := lower(coalesce(nullif(btrim(coalesce(_payload->>'source', '')), ''), 'manual'));
  IF _source NOT IN ('agency_terms', 'manual') THEN
    _source := 'manual';
  END IF;

  UPDATE public.travel_file_services s
     SET operator_id = CASE
           WHEN _payload ? 'operator_id' THEN nullif(btrim(coalesce(_payload->>'operator_id', '')), '')::uuid
           ELSE s.operator_id END,
         supplier_name = CASE
           WHEN _payload ? 'supplier_name' THEN nullif(btrim(coalesce(_payload->>'supplier_name', '')), '')
           ELSE s.supplier_name END,
         commission_type = _commission_type,
         commission_percent = nullif(btrim(coalesce(_payload->>'commission_percent', '')), '')::numeric,
         commission_fixed = nullif(btrim(coalesce(_payload->>'commission_fixed', '')), '')::numeric,
         non_commissionable_fees = coalesce(nullif(btrim(coalesce(_payload->>'non_commissionable_fees', '')), '')::numeric, 0),
         payment_rule = _payment_rule,
         payment_days = nullif(btrim(coalesce(_payload->>'payment_days', '')), '')::int,
         requires_invoice = coalesce((_payload->>'requires_invoice')::boolean, false),
         financial_rule_status = _status,
         financial_rule_snapshot = jsonb_build_object(
             'source', _source,
             'status', _status,
             'operator_id', nullif(btrim(coalesce(_payload->>'operator_id', '')), ''),
             'supplier_name', nullif(btrim(coalesce(_payload->>'supplier_name', '')), ''),
             'commission_type', _commission_type,
             'commission_percent', nullif(btrim(coalesce(_payload->>'commission_percent', '')), '')::numeric,
             'commission_fixed', nullif(btrim(coalesce(_payload->>'commission_fixed', '')), '')::numeric,
             'non_commissionable_fees', coalesce(nullif(btrim(coalesce(_payload->>'non_commissionable_fees', '')), '')::numeric, 0),
             'payment_rule', _payment_rule,
             'payment_days', nullif(btrim(coalesce(_payload->>'payment_days', '')), '')::int,
             'requires_invoice', coalesce((_payload->>'requires_invoice')::boolean, false),
             'justification', nullif(btrim(coalesce(_payload->>'justification', '')), '')
           ),
         financial_rule_snapshot_at = now(),
         updated_at = now()
   WHERE s.id = _service_id;

  INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
  VALUES (_service.file_id, _file.agency_id, 'service_financial_rule_set', auth.uid(),
          jsonb_build_object('service_id', _service_id,
                             'service_name', _service.product_name,
                             'status', _status,
                             'source', _source));
END;
$function$;