-- 0027: Remove financial setup from the shared pre-sale confirmation source.
-- Pending cost/commission/invoice/payment settings are configured after the sale.

ALTER TABLE public.sale_products
  DROP CONSTRAINT IF EXISTS sale_products_commission_status_check;

ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_commission_status_check
  CHECK (commission_status = ANY (ARRAY[
    'pending_configuration'::text,
    'previsao_criada'::text,
    'aguardando_emissao_nota'::text,
    'aguardando_envio_nota'::text,
    'aguardando_pagamento'::text,
    'recebido_parcial'::text,
    'recebido'::text,
    'cancelado'::text
  ])) NOT VALID;

COMMENT ON CONSTRAINT sale_products_commission_status_check ON public.sale_products IS
  'Allows pending_configuration for products born from V2 sale confirmation before financial setup.';

COMMENT ON COLUMN public.sale_products.commission_status IS
  'pending_configuration means financial cost/commission/invoice/payment rules must be configured after the sale.';

DO $migration$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public'
    AND p.proname = 'confirm_travel_file_sale'
    AND p.oid = 'public.confirm_travel_file_sale(uuid,text,jsonb,timestamp with time zone)'::regprocedure;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'confirm_travel_file_sale(uuid,text,jsonb,timestamp with time zone) nao encontrada';
  END IF;

  IF position('FINANCIAL_RULE_PENDING' in v_def) > 0 THEN
    RAISE EXCEPTION 'confirm_travel_file_sale ainda contem FINANCIAL_RULE_PENDING antes da migration 0027';
  END IF;

  v_new := replace(v_def, $old$  -- ===== Produtos financeiros com tipo canônico =====
  IF _is_package THEN
    SELECT coalesce(sum(
      CASE
        WHEN coalesce(s.financial_rule_status, 'pending') = 'not_applicable' THEN 0
        WHEN s.commission_type IN ('percentage','percent') AND s.commission_percent IS NOT NULL
          THEN coalesce(s.sold_amount, s.reconfirmed_amount, s.requested_amount) * s.commission_percent / 100
        WHEN s.commission_type = 'fixed' THEN coalesce(s.commission_fixed, s.commission_amount, 0)
        ELSE coalesce(s.commission_amount, 0)
      END), 0)
      INTO _comm_sum
    FROM public.travel_file_services s WHERE s.id = ANY(_eligible);

    IF NOT EXISTS (SELECT 1 FROM public.sale_products sp
                   WHERE sp.sale_id = _sale_id AND sp.source_kind = 'travel_file_package') THEN
      INSERT INTO public.sale_products (
        sale_id, user_id, product_type, description, sale_price, cost_price,
        commission_type, commission_value, source_kind, source_provenance
      )
      SELECT _sale_id, _file.agency_id, public.canonical_sale_product_type('pacote'),
             'Pacote - ' || coalesce(_file.trip_name, _file.primary_destination, 'Viagem'),
             _total,
             coalesce(sum(coalesce(s.cost_amount, 0)), 0),
             'fixed', _comm_sum,
             'travel_file_package',
             jsonb_build_object('travel_file_id', p_file_id,
                                'travel_file_service_ids', to_jsonb(_eligible),
                                'operation_id', _operation_id)
      FROM public.travel_file_services s WHERE s.id = ANY(_eligible);
      _created := array_append(_created, 'sale_product_package');
    ELSE
      _reused := array_append(_reused, 'sale_product_package');
    END IF;
  ELSE
    FOR _i IN 1 .. array_length(_eligible, 1) LOOP
      SELECT * INTO _service FROM public.travel_file_services s WHERE s.id = _eligible[_i];
      _price := coalesce(_service.sold_amount, _service.reconfirmed_amount, _service.requested_amount);
      _comm_type := 'fixed';
      _comm_value := 0;
      IF coalesce(_service.financial_rule_status, 'pending') = 'not_applicable' THEN
        _comm_type := 'fixed'; _comm_value := 0;
      ELSIF _service.commission_type IN ('percentage','percent') AND _service.commission_percent IS NOT NULL THEN
        _comm_type := 'percentage'; _comm_value := _service.commission_percent;
      ELSIF _service.commission_type = 'fixed' THEN
        _comm_type := 'fixed'; _comm_value := coalesce(_service.commission_fixed, _service.commission_amount, 0);
      ELSIF _service.commission_amount IS NOT NULL AND _service.commission_amount > 0 THEN
        _comm_type := 'fixed'; _comm_value := _service.commission_amount;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.sale_products sp
                     WHERE sp.source_travel_file_service_id = _service.id) THEN
        BEGIN
          INSERT INTO public.sale_products (
            sale_id, user_id, product_type, description, sale_price, cost_price,
            commission_type, commission_value, non_commissionable_taxes,
            supplier_name, payment_rule, payment_days, requires_invoice,
            source_travel_file_service_id, source_operation_service_id,
            source_kind, source_provenance
          ) VALUES (
            _sale_id, _file.agency_id,
            public.canonical_sale_product_type(_service.service_type),
            _service.product_name, _price, coalesce(_service.cost_amount, 0),
            _comm_type, _comm_value, coalesce(_service.non_commissionable_fees, 0),
            _service.supplier_name, _service.payment_rule, _service.payment_days,
            coalesce(_service.requires_invoice, false),
            _service.id, _op_service_ids[_i],
            'travel_file_service',
            jsonb_build_object('travel_file_id', p_file_id,
                               'travel_file_service_id', _service.id,
                               'operation_service_id', _op_service_ids[_i],
                               'operation_id', _operation_id,
                               'service_type_original', _service.service_type,
                               'financial_rule_snapshot', _service.financial_rule_snapshot)
          );
          _created := array_append(_created, 'sale_product');
        EXCEPTION WHEN unique_violation THEN
          _reused := array_append(_reused, 'sale_product');
        END;
      ELSE
        _reused := array_append(_reused, 'sale_product');
      END IF;
    END LOOP;
  END IF;

$old$, $new$  -- ===== Produtos financeiros com tipo canônico =====
  -- 0027: regra financeira pendente nasce como configuração pendente no Financeiro.
  -- Nada de custo/comissão/NF/prazo é inventado ou exigido antes da venda.
  IF _is_package THEN
    IF NOT EXISTS (SELECT 1 FROM public.sale_products sp
                   WHERE sp.sale_id = _sale_id AND sp.source_kind = 'travel_file_package') THEN
      INSERT INTO public.sale_products (
        sale_id, user_id, product_type, description, sale_price, cost_price,
        commission_type, commission_value, non_commissionable_taxes,
        payment_rule, payment_days, requires_invoice, commission_status,
        source_kind, source_provenance
      )
      SELECT _sale_id, _file.agency_id, public.canonical_sale_product_type('pacote'),
             'Pacote - ' || coalesce(_file.trip_name, _file.primary_destination, 'Viagem'),
             _total,
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN 0
               ELSE coalesce(sum(coalesce(s.cost_amount, 0)), 0)
             END,
             'fixed',
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN 0
               ELSE coalesce(sum(
                 CASE
                   WHEN coalesce(s.financial_rule_status, 'pending') = 'not_applicable' THEN 0
                   WHEN s.commission_type IN ('percentage','percent') AND s.commission_percent IS NOT NULL
                     THEN coalesce(s.sold_amount, s.reconfirmed_amount, s.requested_amount) * s.commission_percent / 100
                   WHEN s.commission_type = 'fixed' THEN coalesce(s.commission_fixed, s.commission_amount, 0)
                   ELSE coalesce(s.commission_amount, 0)
                 END), 0)
             END,
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN 0
               ELSE coalesce(sum(coalesce(s.non_commissionable_fees, 0)), 0)
             END,
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN 'manual'
               ELSE coalesce((array_agg(s.payment_rule ORDER BY s.created_at, s.id) FILTER (WHERE s.payment_rule IS NOT NULL))[1], 'after_sale')
             END,
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN 0
               ELSE coalesce((array_agg(s.payment_days ORDER BY s.created_at, s.id) FILTER (WHERE s.payment_days IS NOT NULL))[1], 30)
             END,
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN false
               ELSE coalesce(bool_or(coalesce(s.requires_invoice, false)), false)
             END,
             CASE
               WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending') THEN 'pending_configuration'
               ELSE 'previsao_criada'
             END,
             'travel_file_package',
             jsonb_build_object('travel_file_id', p_file_id,
                                'travel_file_service_ids', to_jsonb(_eligible),
                                'operation_id', _operation_id,
                                'financial_configuration_status',
                                  CASE
                                    WHEN bool_or(coalesce(s.financial_rule_status, 'pending') = 'pending')
                                    THEN 'pending_configuration'
                                    ELSE 'configured'
                                  END)
      FROM public.travel_file_services s WHERE s.id = ANY(_eligible);
      _created := array_append(_created, 'sale_product_package');
    ELSE
      _reused := array_append(_reused, 'sale_product_package');
    END IF;
  ELSE
    FOR _i IN 1 .. array_length(_eligible, 1) LOOP
      SELECT * INTO _service FROM public.travel_file_services s WHERE s.id = _eligible[_i];
      _price := coalesce(_service.sold_amount, _service.reconfirmed_amount, _service.requested_amount);
      _comm_type := 'fixed';
      _comm_value := 0;
      IF coalesce(_service.financial_rule_status, 'pending') <> 'pending' THEN
        IF coalesce(_service.financial_rule_status, 'pending') = 'not_applicable' THEN
          _comm_type := 'fixed'; _comm_value := 0;
        ELSIF _service.commission_type IN ('percentage','percent') AND _service.commission_percent IS NOT NULL THEN
          _comm_type := 'percentage'; _comm_value := _service.commission_percent;
        ELSIF _service.commission_type = 'fixed' THEN
          _comm_type := 'fixed'; _comm_value := coalesce(_service.commission_fixed, _service.commission_amount, 0);
        ELSIF _service.commission_amount IS NOT NULL AND _service.commission_amount > 0 THEN
          _comm_type := 'fixed'; _comm_value := _service.commission_amount;
        END IF;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM public.sale_products sp
                     WHERE sp.source_travel_file_service_id = _service.id) THEN
        BEGIN
          INSERT INTO public.sale_products (
            sale_id, user_id, product_type, description, sale_price, cost_price,
            commission_type, commission_value, non_commissionable_taxes,
            supplier_name, payment_rule, payment_days, requires_invoice, commission_status,
            source_travel_file_service_id, source_operation_service_id,
            source_kind, source_provenance
          ) VALUES (
            _sale_id, _file.agency_id,
            public.canonical_sale_product_type(_service.service_type),
            _service.product_name, _price,
            CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
              THEN 0 ELSE coalesce(_service.cost_amount, 0) END,
            _comm_type, _comm_value,
            CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
              THEN 0 ELSE coalesce(_service.non_commissionable_fees, 0) END,
            _service.supplier_name,
            CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
              THEN 'manual' ELSE _service.payment_rule END,
            CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
              THEN 0 ELSE _service.payment_days END,
            CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
              THEN false ELSE coalesce(_service.requires_invoice, false) END,
            CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
              THEN 'pending_configuration' ELSE 'previsao_criada' END,
            _service.id, _op_service_ids[_i],
            'travel_file_service',
            jsonb_build_object('travel_file_id', p_file_id,
                               'travel_file_service_id', _service.id,
                               'operation_service_id', _op_service_ids[_i],
                               'operation_id', _operation_id,
                               'service_type_original', _service.service_type,
                               'financial_rule_snapshot', _service.financial_rule_snapshot,
                               'financial_configuration_status',
                                 CASE WHEN coalesce(_service.financial_rule_status, 'pending') = 'pending'
                                   THEN 'pending_configuration' ELSE 'configured' END)
          );
          _created := array_append(_created, 'sale_product');
        EXCEPTION WHEN unique_violation THEN
          _reused := array_append(_reused, 'sale_product');
        END;
      ELSE
        _reused := array_append(_reused, 'sale_product');
      END IF;
    END LOOP;
  END IF;

$new$);

  IF v_new = v_def THEN
    RAISE EXCEPTION '0027 nao encontrou o bloco de materializacao financeira esperado';
  END IF;

  IF position('FINANCIAL_RULE_PENDING' in v_new) > 0 THEN
    RAISE EXCEPTION 'confirm_travel_file_sale ainda contem FINANCIAL_RULE_PENDING apos migration 0027';
  END IF;

  EXECUTE v_new;
END
$migration$;

COMMENT ON FUNCTION public.confirm_travel_file_sale(uuid, text, jsonb, timestamp with time zone) IS
  'V2 canonical sale confirmation. Pre-sale blockers are operational only; pending financial settings create products with pending_configuration.';