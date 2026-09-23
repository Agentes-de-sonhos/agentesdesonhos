-- ============================================================================
-- 0026 - Identidade real do servico, fornecedor migrado e financeiro fora do
--        bloqueio pre-venda (fluxo unificado V2)
--
-- CAUSAS RAIZ
-- 1) `ensure_travel_file` copiava `quote_booking_request_items.service_name`
--    direto para `travel_file_services.product_name`. Esse campo carrega a
--    ETIQUETA da alternativa do orcamento (`option_label`, ex.: "Melhor
--    custo-beneficio") ou o proprio tipo ("hotel"), nunca o nome real do
--    produto. O nome real (companhia aerea, nome do hotel, etc.) e o
--    fornecedor escolhido ficam em `snapshot->'service_data'` e nunca eram
--    lidos.
-- 2) `confirm_travel_file_sale` exigia regra financeira confirmada e
--    fornecedor identificado ANTES da venda, o que trava a operacao por dados
--    que pertencem a Gestao Financeira (custo, comissao, NF, prazos).
--
-- CORRECAO (aditiva; 0013-0025 permanecem intactas)
-- - Funcoes de leitura para nome real e fornecedor a partir do snapshot.
-- - `ensure_travel_file` recriada usando essas funcoes (novos processos).
-- - `travel_file_service_refresh_identity(file)` recupera nome/fornecedor de
--   processos existentes SOMENTE a partir do que ja existe no snapshot, sem
--   inventar dado e sem tocar em processo convertido.
-- - `confirm_travel_file_sale` tem apenas os dois bloqueios pre-venda
--   (FINANCIAL_RULE_PENDING e SUPPLIER_MISSING) removidos, por reescrita
--   cirurgica da definicao aplicada (mesmo metodo da 0022): assinatura,
--   seguranca, locks, idempotencia, RLS e o restante da logica ficam iguais.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Rotulo amigavel do tipo de servico (espelha OPERATION_SERVICE_LABELS no app)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.travel_file_service_type_label(p_service_type text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT CASE lower(btrim(coalesce(p_service_type, '')))
    WHEN 'flight' THEN 'Passagem aérea'
    WHEN 'hotel' THEN 'Hospedagem'
    WHEN 'car_rental' THEN 'Locação de veículo'
    WHEN 'transfer' THEN 'Transfer'
    WHEN 'attraction' THEN 'Ingressos / Atrações'
    WHEN 'insurance' THEN 'Seguro viagem'
    WHEN 'cruise' THEN 'Cruzeiro'
    WHEN 'train' THEN 'Trem'
    ELSE 'Serviço'
  END
$function$;

-- ---------------------------------------------------------------------------
-- Nome real do produto: dados estruturados > nome do item (quando nao for a
-- etiqueta da opcao nem o proprio tipo) > rotulo do tipo.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.travel_file_service_display_name(
  p_service_type text,
  p_service_name text,
  p_snapshot jsonb
)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  sd jsonb := coalesce(p_snapshot->'service_data', '{}'::jsonb);
  sn jsonb := coalesce(p_snapshot, '{}'::jsonb);
  v_type text := lower(btrim(coalesce(p_service_type, '')));
  v_structured text;
  v_name text := nullif(btrim(coalesce(p_service_name, '')), '');
  v_option text := nullif(btrim(coalesce(sn->>'option_label', '')), '');
BEGIN
  v_structured := CASE v_type
    WHEN 'flight' THEN coalesce(sd->>'airline', sd->>'airline_name', sd->>'company')
    WHEN 'hotel' THEN coalesce(sd->>'hotel_name', sd->>'name', sd->>'property_name')
    WHEN 'car_rental' THEN coalesce(sd->>'rental_company', sd->>'company', sd->>'vehicle_category', sd->>'car_category')
    WHEN 'insurance' THEN coalesce(sd->>'plan_name', sd->>'insurer', sd->>'provider')
    WHEN 'cruise' THEN coalesce(sd->>'ship_name', sd->>'cruise_line')
    ELSE coalesce(sd->>'name', sd->>'establishment', sd->>'place_name',
                  sd->>'attraction_name', sd->>'product_name', sd->>'title',
                  sd->>'service_name')
  END;
  v_structured := nullif(btrim(coalesce(v_structured, '')), '');
  IF v_structured IS NOT NULL THEN RETURN v_structured; END IF;

  IF v_name IS NOT NULL
     AND lower(v_name) <> lower(coalesce(v_option, '~'))
     AND lower(v_name) <> v_type
     AND lower(v_name) <> lower(public.travel_file_service_type_label(v_type))
  THEN
    RETURN v_name;
  END IF;

  RETURN public.travel_file_service_type_label(v_type);
END;
$function$;

-- ---------------------------------------------------------------------------
-- Fornecedor do snapshot: somente o que o orcamento realmente registrou.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.travel_file_service_supplier_name(
  p_service_type text,
  p_snapshot jsonb
)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $function$
  SELECT nullif(btrim(coalesce(
    sd->>'supplier_name', sd->>'supplier', sd->>'operator',
    sd->>'consolidator', sd->>'hotel_chain', sd->>'rental_company',
    sd->>'cruise_line', sd->>'insurer', sd->>'provider',
    sn->>'supplier', sn->>'operator', sn->>'company', ''
  )), '')
  FROM (SELECT coalesce(p_snapshot->'service_data', '{}'::jsonb) AS sd,
               coalesce(p_snapshot, '{}'::jsonb) AS sn) x
$function$;

CREATE OR REPLACE FUNCTION public.travel_file_service_operator_id(p_snapshot jsonb)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SET search_path TO 'public'
AS $function$
DECLARE
  sd jsonb := coalesce(p_snapshot->'service_data', '{}'::jsonb);
  v_raw text := nullif(btrim(coalesce(sd->>'supplier_operator_id', sd->>'operator_id',
                                      coalesce(p_snapshot, '{}'::jsonb)->>'supplier_operator_id', '')), '');
  v_id uuid;
BEGIN
  IF v_raw IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_id := v_raw::uuid;
  EXCEPTION WHEN others THEN
    RETURN NULL;
  END;
  IF NOT EXISTS (SELECT 1 FROM public.tour_operators o WHERE o.id = v_id) THEN
    RETURN NULL;
  END IF;
  RETURN v_id;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.travel_file_service_type_label(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.travel_file_service_display_name(text, text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.travel_file_service_supplier_name(text, jsonb) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.travel_file_service_operator_id(jsonb) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- ensure_travel_file: mesma orquestracao, agora materializando nome real e
-- fornecedor. Continua idempotente (ON CONFLICT (request_item_id)).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ensure_travel_file(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_req RECORD;
  v_root uuid;
  v_root_req RECORD;
  v_quote RECORD;
  v_file RECORD;
  v_file_id uuid;
  v_number integer;
  v_agency uuid;
  v_total numeric := 0;
  v_items_sum numeric := 0;
  v_responsible uuid;
  v_client uuid;
BEGIN
  SELECT * INTO v_req FROM public.quote_booking_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN RETURN NULL; END IF;

  v_root := COALESCE(v_req.root_request_id, v_req.id);
  SELECT * INTO v_root_req FROM public.quote_booking_requests WHERE id = v_root;
  SELECT * INTO v_quote FROM public.quotes WHERE id = v_req.quote_id;
  v_agency := COALESCE(v_req.agency_id, v_req.user_id, v_quote.user_id);
  IF v_agency IS NULL THEN RETURN NULL; END IF;

  v_client := COALESCE(v_quote.client_id, v_req.client_id);

  SELECT COALESCE(sum(i.amount_snapshot * GREATEST(i.quantity, 1)), 0)
    INTO v_items_sum
  FROM public.quote_booking_request_items i WHERE i.request_id = v_req.id;

  IF COALESCE(v_quote.pricing_mode, 'itemized') = 'package' THEN
    v_total := COALESCE(
      NULLIF(v_quote.package_total_amount, 0),
      NULLIF(v_quote.total_amount, 0),
      NULLIF(v_req.total_estimated, 0),
      v_items_sum
    );
  ELSE
    v_total := COALESCE(NULLIF(v_items_sum, 0), NULLIF(v_req.total_estimated, 0), 0);
  END IF;

  SELECT o.assigned_team_member_id INTO v_responsible
  FROM public.opportunities o
  WHERE o.id = COALESCE(v_quote.opportunity_id, v_req.opportunity_id);
  IF v_responsible IS NULL AND v_client IS NOT NULL THEN
    SELECT c.assigned_team_member_id INTO v_responsible FROM public.clients c WHERE c.id = v_client;
  END IF;

  SELECT * INTO v_file FROM public.travel_files WHERE root_request_id = v_root FOR UPDATE;

  IF v_file.id IS NULL THEN
    v_number := public.next_agency_file_number(v_agency);
    INSERT INTO public.travel_files (
      agency_id, file_number, client_id, opportunity_id, quote_id,
      root_request_id, current_request_id, revision, protocol_snapshot,
      responsible_user_id, responsible_team_member_id, original_responsible_team_member_id,
      primary_destination, destinations, start_date, end_date,
      adults_count, children_count, passengers_count, passengers_snapshot,
      currency, pricing_mode, requested_amount, status, opened_at
    ) VALUES (
      v_agency, v_number, v_client,
      COALESCE(v_quote.opportunity_id, v_req.opportunity_id), v_req.quote_id,
      v_root, v_req.id, GREATEST(COALESCE(v_req.version, 1), 1),
      COALESCE(v_root_req.protocol, v_req.protocol),
      v_agency, v_responsible, v_responsible,
      NULLIF(btrim(COALESCE(v_quote.destination, '')), ''),
      CASE WHEN NULLIF(btrim(COALESCE(v_quote.destination, '')), '') IS NULL
           THEN '{}'::text[] ELSE ARRAY[btrim(v_quote.destination)] END,
      v_quote.start_date, v_quote.end_date,
      GREATEST(COALESCE(v_quote.adults_count, 1), 1), COALESCE(v_quote.children_count, 0),
      GREATEST(COALESCE(v_quote.adults_count, 1), 1) + COALESCE(v_quote.children_count, 0),
      jsonb_build_object('adults', GREATEST(COALESCE(v_quote.adults_count, 1), 1),
                         'children', COALESCE(v_quote.children_count, 0)),
      COALESCE(v_req.currency, v_quote.currency, 'BRL'),
      COALESCE(v_quote.pricing_mode, 'itemized'),
      GREATEST(COALESCE(v_total, 0), 0), 'request_received',
      COALESCE(v_root_req.created_at, v_req.created_at, now())
    )
    RETURNING id INTO v_file_id;
  ELSE
    v_file_id := v_file.id;
    UPDATE public.travel_files f
    SET current_request_id = v_req.id,
        revision = GREATEST(COALESCE(v_req.version, 1), f.revision),
        client_id = COALESCE(f.client_id, v_client),
        opportunity_id = COALESCE(v_quote.opportunity_id, v_req.opportunity_id, f.opportunity_id),
        requested_amount = GREATEST(COALESCE(v_total, f.requested_amount, 0), 0),
        currency = COALESCE(v_req.currency, f.currency),
        updated_at = now()
    WHERE f.id = v_file_id;
  END IF;

  -- servicos: somente os itens efetivamente solicitados (selecionados + obrigatorios)
  INSERT INTO public.travel_file_services (
    file_id, agency_id, request_item_id, source_quote_service_id, service_type,
    product_name, supplier_name, operator_id, city, destination, country,
    start_date, end_date, quantity, passengers_count, currency,
    requested_amount, responsible_team_member_id, is_required, snapshot
  )
  SELECT
    v_file_id, v_agency, i.id, i.source_quote_service_id, i.service_type,
    public.travel_file_service_display_name(i.service_type, i.service_name, i.snapshot),
    public.travel_file_service_supplier_name(i.service_type, i.snapshot),
    public.travel_file_service_operator_id(i.snapshot),
    NULLIF(btrim(COALESCE(i.snapshot->'service_data'->>'city', i.snapshot->>'city', '')), ''),
    NULLIF(btrim(COALESCE(i.snapshot->>'destination', v_quote.destination, '')), ''),
    NULLIF(btrim(COALESCE(i.snapshot->>'country', '')), ''),
    NULLIF(COALESCE(i.snapshot->'service_data'->>'start_date', i.snapshot->'service_data'->>'check_in',
                    i.snapshot->'service_data'->>'departure_date',
                    i.snapshot->>'start_date', i.snapshot->>'check_in', i.snapshot->>'date'), '')::date,
    NULLIF(COALESCE(i.snapshot->'service_data'->>'end_date', i.snapshot->'service_data'->>'check_out',
                    i.snapshot->'service_data'->>'return_date',
                    i.snapshot->>'end_date', i.snapshot->>'check_out'), '')::date,
    GREATEST(COALESCE(i.quantity, 1), 1),
    GREATEST(COALESCE(v_quote.adults_count, 1), 1) + COALESCE(v_quote.children_count, 0),
    COALESCE(v_req.currency, v_quote.currency, 'BRL'),
    COALESCE(i.amount_snapshot, 0), v_responsible,
    COALESCE(i.selection_mode_snapshot, 'optional') = 'required',
    i.snapshot
  FROM public.quote_booking_request_items i
  WHERE i.request_id = v_req.id
  ON CONFLICT (request_item_id) DO NOTHING;

  RETURN v_file_id;
EXCEPTION WHEN others THEN
  RAISE WARNING 'ensure_travel_file falhou para %: %', p_request_id, SQLERRM;
  RETURN NULL;
END;
$function$;

-- ---------------------------------------------------------------------------
-- Recuperacao de identidade em processos existentes: nome real e fornecedor
-- SOMENTE a partir do snapshot. Nao confirma venda, nao cria operacao/venda,
-- nao inventa fornecedor, nao toca em processo convertido.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.travel_file_service_refresh_identity(p_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_file RECORD;
  v_renamed integer := 0;
  v_supplied integer := 0;
BEGIN
  SELECT * INTO v_file FROM public.travel_files WHERE id = p_file_id FOR UPDATE;
  IF v_file.id IS NULL THEN
    RETURN jsonb_build_object('error', 'file_not_found');
  END IF;
  IF v_file.operation_id IS NOT NULL THEN
    RETURN jsonb_build_object('error', 'file_already_converted');
  END IF;

  WITH upd AS (
    UPDATE public.travel_file_services s
       SET product_name = public.travel_file_service_display_name(
             s.service_type, s.product_name, s.snapshot),
           updated_at = now()
     WHERE s.file_id = p_file_id
       AND public.travel_file_service_display_name(s.service_type, s.product_name, s.snapshot)
           <> coalesce(s.product_name, '')
     RETURNING 1
  ) SELECT count(*) INTO v_renamed FROM upd;

  WITH upd AS (
    UPDATE public.travel_file_services s
       SET supplier_name = coalesce(
             nullif(btrim(coalesce(s.supplier_name, '')), ''),
             public.travel_file_service_supplier_name(s.service_type, s.snapshot)),
           operator_id = coalesce(s.operator_id, public.travel_file_service_operator_id(s.snapshot)),
           updated_at = now()
     WHERE s.file_id = p_file_id
       AND (
         (nullif(btrim(coalesce(s.supplier_name, '')), '') IS NULL
          AND public.travel_file_service_supplier_name(s.service_type, s.snapshot) IS NOT NULL)
         OR (s.operator_id IS NULL
             AND public.travel_file_service_operator_id(s.snapshot) IS NOT NULL)
       )
     RETURNING 1
  ) SELECT count(*) INTO v_supplied FROM upd;

  IF (v_renamed + v_supplied) > 0 AND v_file.current_request_id IS NOT NULL THEN
    INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
    VALUES (
      v_file.current_request_id, 'system', 'file_services_identity_refreshed',
      jsonb_build_object('file_id', p_file_id, 'renamed', v_renamed,
                         'suppliers_filled', v_supplied, 'migration', '0026')
    );
  END IF;

  RETURN jsonb_build_object('file_id', p_file_id, 'renamed', v_renamed,
                            'suppliers_filled', v_supplied);
END;
$function$;

REVOKE ALL ON FUNCTION public.travel_file_service_refresh_identity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.travel_file_service_refresh_identity(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.travel_file_service_refresh_identity(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.travel_file_service_refresh_identity(uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- confirm_travel_file_sale: remove SOMENTE os dois bloqueios pre-venda de
-- natureza financeira. Reescrita cirurgica da definicao aplicada.
-- ---------------------------------------------------------------------------
DO $migration$
DECLARE
  v_def text;
  v_new text;
BEGIN
  SELECT pg_get_functiondef(p.oid) INTO v_def
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'confirm_travel_file_sale'
  LIMIT 1;

  IF v_def IS NULL THEN
    RAISE EXCEPTION 'confirm_travel_file_sale nao encontrada';
  END IF;

  v_new := regexp_replace(
    v_def,
    'IF EXISTS \(SELECT 1 FROM public\.travel_file_services s[^;]*FINANCIAL_RULE_PENDING[^;]*;\s*END IF;',
    '-- 0026: regra financeira nao bloqueia mais a confirmacao da venda.',
    'g');
  v_new := regexp_replace(
    v_new,
    'IF EXISTS \(SELECT 1 FROM public\.travel_file_services s[^;]*SUPPLIER_MISSING[^;]*;\s*END IF;',
    '-- 0026: fornecedor e exigido na etapa de reserva/emissao, nao na venda.',
    'g');

  IF position('FINANCIAL_RULE_PENDING' in v_new) > 0
     OR position('SUPPLIER_MISSING' in v_new) > 0 THEN
    RAISE EXCEPTION 'nao foi possivel remover os bloqueios pre-venda de confirm_travel_file_sale';
  END IF;

  IF v_new = v_def THEN
    RAISE NOTICE 'confirm_travel_file_sale ja estava sem os bloqueios pre-venda';
    RETURN;
  END IF;

  EXECUTE v_new;
END
$migration$;