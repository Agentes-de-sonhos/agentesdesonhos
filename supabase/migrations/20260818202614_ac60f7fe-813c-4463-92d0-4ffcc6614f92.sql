-- =============================================================
-- SEGUNDA CORRECAO: pedido de reserva por orcamento web
-- 1) identidade do cliente vem da quote (nunca cria cliente novo)
-- 2) oportunidade unica, estagio negotiation, estimated_value correto
-- 3) conversao para Operacao copia SOMENTE os itens do pedido ativo
-- 4) backfill idempotente do pedido real de teste
-- Nao cria dados ficticios. Nao exclui nada.
-- =============================================================

-- ---------- 1) contato obrigatorio apenas sem cliente vinculado ----------
ALTER TABLE public.quote_booking_requests
  DROP CONSTRAINT IF EXISTS quote_booking_requests_contact_check;

ALTER TABLE public.quote_booking_requests
  ADD CONSTRAINT quote_booking_requests_contact_check CHECK (
    client_id IS NOT NULL
    OR length(btrim(COALESCE(client_email, ''))) > 0
    OR length(btrim(COALESCE(client_whatsapp, ''))) > 0
  );

-- ---------- 2) etapa comercial de negociacao ----------
CREATE OR REPLACE FUNCTION public.booking_request_negotiation_stage(_user_id uuid)
RETURNS TABLE (stage_id uuid, legacy_key text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH s AS (
    SELECT id, legacy_key, position
    FROM public.pipeline_stages
    WHERE user_id = _user_id
  )
  SELECT id, legacy_key FROM (
    SELECT id, legacy_key, 0 AS rank, position FROM s WHERE legacy_key = 'negotiation'
    UNION ALL
    -- fallback robusto: ultima etapa comercial antes de closed/lost
    SELECT id, legacy_key, 1, position FROM s
    WHERE COALESCE(legacy_key, '') NOT IN ('closed', 'lost')
    UNION ALL
    SELECT id, legacy_key, 2, position FROM s
  ) x
  ORDER BY rank ASC, position DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.booking_request_negotiation_stage(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_request_negotiation_stage(uuid) TO service_role;

-- ---------- 3) oportunidade unica do pedido ----------
CREATE OR REPLACE FUNCTION public.sync_booking_request_opportunity(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req RECORD;
  v_quote RECORD;
  v_opp uuid;
  v_stage RECORD;
  v_cur_legacy text;
  v_total numeric := 0;
  v_client uuid;
  v_names text;
  v_already boolean := false;
BEGIN
  SELECT * INTO v_req FROM public.quote_booking_requests WHERE id = p_request_id FOR UPDATE;
  IF v_req.id IS NULL THEN RETURN NULL; END IF;

  SELECT * INTO v_quote FROM public.quotes WHERE id = v_req.quote_id FOR UPDATE;
  IF v_quote.id IS NULL THEN RETURN NULL; END IF;

  v_client := COALESCE(v_quote.client_id, v_req.client_id);
  IF v_client IS NULL THEN RETURN NULL; END IF;

  -- valor: total dos itens selecionados OU total fechado do pacote
  SELECT COALESCE(sum(i.amount_snapshot * GREATEST(i.quantity, 1)), 0)
    INTO v_total
  FROM public.quote_booking_request_items i WHERE i.request_id = v_req.id;

  IF COALESCE(v_quote.pricing_mode, 'itemized') = 'package' THEN
    v_total := COALESCE(
      NULLIF(v_quote.package_total_amount, 0),
      NULLIF(v_quote.total_amount, 0),
      NULLIF(v_req.total_estimated, 0),
      v_total
    );
  ELSE
    v_total := COALESCE(NULLIF(v_total, 0), NULLIF(v_req.total_estimated, 0), 0);
  END IF;

  -- a) oportunidade da quote
  v_opp := v_quote.opportunity_id;
  IF v_opp IS NOT NULL THEN
    PERFORM 1 FROM public.opportunities o WHERE o.id = v_opp AND o.user_id = v_quote.user_id;
    IF NOT FOUND THEN v_opp := NULL; END IF;
  END IF;

  -- b) oportunidade de um pedido anterior da MESMA quote
  IF v_opp IS NULL THEN
    SELECT r.opportunity_id INTO v_opp
    FROM public.quote_booking_requests r
    JOIN public.opportunities o ON o.id = r.opportunity_id AND o.user_id = v_quote.user_id
    WHERE r.quote_id = v_quote.id AND r.opportunity_id IS NOT NULL
    ORDER BY r.created_at ASC
    LIMIT 1;
  END IF;

  SELECT * INTO v_stage FROM public.booking_request_negotiation_stage(v_quote.user_id);

  -- c) cria UMA oportunidade para o cliente da quote
  IF v_opp IS NULL THEN
    INSERT INTO public.opportunities (
      user_id, client_id, destination, start_date, end_date,
      adults_count, children_count, passengers_count,
      estimated_value, stage, stage_id, notes
    ) VALUES (
      v_quote.user_id, v_client,
      COALESCE(NULLIF(btrim(COALESCE(v_quote.destination, '')), ''),
               NULLIF(btrim(COALESCE(v_quote.trip_title, '')), ''), 'A definir'),
      v_quote.start_date, v_quote.end_date,
      GREATEST(COALESCE(v_quote.adults_count, 1), 1), COALESCE(v_quote.children_count, 0),
      GREATEST(COALESCE(v_quote.adults_count, 1), 1) + COALESCE(v_quote.children_count, 0),
      GREATEST(COALESCE(v_total, 0), 0),
      COALESCE(v_stage.legacy_key, 'negotiation'), v_stage.stage_id,
      'Criada a partir de solicitacao de reserva pelo orcamento web.'
    )
    RETURNING id INTO v_opp;
  ELSE
    SELECT COALESCE(ps.legacy_key, o.stage) INTO v_cur_legacy
    FROM public.opportunities o
    LEFT JOIN public.pipeline_stages ps ON ps.id = o.stage_id
    WHERE o.id = v_opp;

    UPDATE public.opportunities o
    SET client_id = v_client,
        destination = COALESCE(NULLIF(btrim(COALESCE(v_quote.destination, '')), ''), o.destination),
        start_date = COALESCE(v_quote.start_date, o.start_date),
        end_date = COALESCE(v_quote.end_date, o.end_date),
        adults_count = GREATEST(COALESCE(v_quote.adults_count, o.adults_count, 1), 1),
        children_count = COALESCE(v_quote.children_count, o.children_count, 0),
        passengers_count = GREATEST(COALESCE(v_quote.adults_count, o.adults_count, 1), 1)
                           + COALESCE(v_quote.children_count, o.children_count, 0),
        estimated_value = GREATEST(COALESCE(v_total, o.estimated_value, 0), 0),
        -- nunca regride oportunidade fechada/perdida
        stage_id = CASE WHEN COALESCE(v_cur_legacy, '') IN ('closed', 'lost')
                        THEN o.stage_id ELSE COALESCE(v_stage.stage_id, o.stage_id) END,
        stage = CASE WHEN COALESCE(v_cur_legacy, '') IN ('closed', 'lost')
                     THEN o.stage ELSE COALESCE(v_stage.legacy_key, o.stage) END,
        updated_at = now()
    WHERE o.id = v_opp;
  END IF;

  UPDATE public.quotes SET opportunity_id = v_opp, updated_at = now()
  WHERE id = v_quote.id AND opportunity_id IS DISTINCT FROM v_opp;

  UPDATE public.quote_booking_requests
  SET opportunity_id = v_opp, client_id = COALESCE(client_id, v_client), updated_at = now()
  WHERE id = v_req.id AND (opportunity_id IS DISTINCT FROM v_opp OR client_id IS NULL);

  -- historico/follow-up apenas UMA vez por pedido
  SELECT EXISTS (
    SELECT 1 FROM public.quote_booking_request_events e
    WHERE e.request_id = v_req.id AND e.event_type = 'crm_opportunity_linked'
  ) INTO v_already;

  IF NOT v_already THEN
    SELECT string_agg(i.service_name, ', ' ORDER BY i.service_name) INTO v_names
    FROM public.quote_booking_request_items i WHERE i.request_id = v_req.id;

    INSERT INTO public.opportunity_history (opportunity_id, from_stage, to_stage, notes)
    SELECT v_opp, o.stage, o.stage, format(
      'Solicitacao de reserva %s (v%s) recebida pelo orcamento web em %s. Servicos: %s. Valor apresentado: %s %s. Status: aguardando reconfirmacao de disponibilidade e valores.',
      v_req.protocol, v_req.version, to_char(now(), 'DD/MM/YYYY HH24:MI'),
      COALESCE(v_names, '-'), COALESCE(v_req.currency, 'BRL'),
      to_char(GREATEST(COALESCE(v_total, 0), 0), 'FM999G999G990D00')
    )
    FROM public.opportunities o WHERE o.id = v_opp;

    INSERT INTO public.opportunity_followups (opportunity_id, user_id, follow_up_date, note)
    VALUES (v_opp, v_quote.user_id, (now() + interval '1 day')::date,
      format('Retornar sobre a solicitacao de reserva %s (reconfirmar servicos, disponibilidade e valores).', v_req.protocol));

    INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
    VALUES (v_req.id, 'system', 'crm_opportunity_linked', jsonb_build_object(
      'opportunity_id', v_opp, 'estimated_value', GREATEST(COALESCE(v_total, 0), 0),
      'stage', COALESCE(v_stage.legacy_key, 'negotiation')
    ));
  END IF;

  RETURN v_opp;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_booking_request_opportunity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_booking_request_opportunity(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_booking_request_opportunity(uuid) TO service_role;

-- ---------- 4) submit: identidade do cliente + oportunidade correta ----------
CREATE OR REPLACE FUNCTION public.submit_quote_booking_request(
  p_agency_slug text,
  p_code text,
  p_selected_service_ids uuid[],
  p_client_name text,
  p_client_email text,
  p_client_whatsapp text,
  p_client_notes text DEFAULT NULL,
  p_disclaimer_accepted boolean DEFAULT false,
  p_idempotency_key text DEFAULT NULL,
  p_source_ip_hash text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_quote RECORD;
  v_profile RECORD;
  v_client RECORD;
  v_agency uuid;
  v_existing RECORD;
  v_prev RECORD;
  v_request_id uuid;
  v_root uuid;
  v_version integer := 1;
  v_protocol text;
  v_token uuid;
  v_email_norm text;
  v_whats_norm text;
  v_name text;
  v_ids uuid[];
  v_total numeric := 0;
  v_items_sum numeric := 0;
  v_count integer := 0;
  v_expires timestamptz;
  v_group RECORD;
  v_selected integer;
  v_is_package boolean := false;
  v_hides_amounts boolean := false;
  v_layout text;
  v_client_id uuid;
  v_opportunity_id uuid;
BEGIN
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 THEN
    RETURN jsonb_build_object('error', 'Requisicao invalida.');
  END IF;

  SELECT * INTO v_existing FROM public.quote_booking_requests
  WHERE idempotency_key = btrim(p_idempotency_key);
  IF v_existing.id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'request_id', v_existing.id,
      'protocol', v_existing.protocol,
      'version', v_existing.version,
      'status', v_existing.status,
      'total_estimated', v_existing.total_estimated,
      'currency', v_existing.currency,
      'public_access_token', v_existing.public_access_token,
      'duplicate', true
    );
  END IF;

  IF p_disclaimer_accepted IS NOT TRUE THEN
    RETURN jsonb_build_object('error', 'E necessario aceitar o aviso de que o pedido nao confirma a reserva.');
  END IF;

  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN jsonb_build_object('error', 'Link invalido.');
  END IF;

  SELECT * INTO v_quote FROM public.quotes
  WHERE public_access_code = p_code AND status = 'published'
  FOR UPDATE;
  IF v_quote.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Orcamento nao encontrado.');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_quote.user_id;
  IF v_profile.user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Orcamento nao encontrado.');
  END IF;

  IF NOT public.agency_public_slug_matches(v_quote.user_id, p_agency_slug) THEN
    RETURN jsonb_build_object('error', 'Orcamento nao encontrado.');
  END IF;

  v_agency := public.resolve_agency_id_for_user(v_quote.user_id);
  IF COALESCE(v_quote.booking_requests_enabled, false) = false
     OR NOT public.agency_can_use_booking_requests(v_agency) THEN
    RETURN jsonb_build_object('error', 'Este orcamento nao aceita pedidos de reserva.');
  END IF;

  -- IDENTIDADE: orcamento nominal usa SEMPRE o cliente vinculado.
  -- Dados de contato enviados pelo navegador sao ignorados nesse caso.
  v_client_id := v_quote.client_id;
  IF v_client_id IS NOT NULL THEN
    SELECT * INTO v_client FROM public.clients WHERE id = v_client_id;
  END IF;

  IF v_client.id IS NOT NULL THEN
    v_name := COALESCE(NULLIF(btrim(v_client.name), ''),
                       NULLIF(btrim(COALESCE(v_quote.client_name, '')), ''), 'Cliente do orcamento');
    v_email_norm := lower(btrim(COALESCE(v_client.email, '')));
    v_whats_norm := btrim(COALESCE(v_client.phone, ''));
  ELSE
    -- Fallback compativel: orcamento sem cliente vinculado exige contato.
    v_client_id := NULL;
    v_name := btrim(COALESCE(p_client_name, ''));
    v_email_norm := lower(btrim(COALESCE(p_client_email, '')));
    v_whats_norm := btrim(COALESCE(p_client_whatsapp, ''));
    IF length(v_name) < 2 THEN
      RETURN jsonb_build_object('error', 'Informe seu nome completo.');
    END IF;
    IF length(v_email_norm) = 0 AND length(v_whats_norm) = 0 THEN
      RETURN jsonb_build_object('error', 'Informe WhatsApp ou e-mail para a agencia entrar em contato.');
    END IF;
  END IF;

  IF v_quote.booking_deadline IS NOT NULL THEN
    IF now() > ((v_quote.booking_deadline::date + 1)::timestamptz) THEN
      RETURN jsonb_build_object('error', 'O prazo para solicitar a reserva deste orcamento terminou.');
    END IF;
    v_expires := (v_quote.booking_deadline::date + 1)::timestamptz;
  END IF;

  v_is_package := COALESCE(v_quote.pricing_mode, 'itemized') = 'package';
  v_layout := COALESCE(v_quote.investment_summary_layout, 'legacy');
  v_hides_amounts := v_is_package AND v_layout IN ('consolidated', 'legacy');

  IF v_is_package THEN
    SELECT COALESCE(array_agg(s.id), '{}'::uuid[]) INTO v_ids
    FROM public.quote_services s WHERE s.quote_id = v_quote.id;
  ELSE
    SELECT COALESCE(array_agg(DISTINCT s.id), '{}'::uuid[]) INTO v_ids
    FROM public.quote_services s
    WHERE s.quote_id = v_quote.id
      AND (
        s.id = ANY (COALESCE(p_selected_service_ids, '{}'::uuid[]))
        OR COALESCE(s.selection_mode, 'optional') = 'required'
      );
  END IF;

  IF array_length(v_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('error', 'Selecione pelo menos um servico.');
  END IF;

  IF NOT v_is_package THEN
    FOR v_group IN
      SELECT g.* FROM public.quote_service_choice_groups g WHERE g.quote_id = v_quote.id
    LOOP
      SELECT count(*) INTO v_selected
      FROM public.quote_services s
      WHERE s.quote_id = v_quote.id AND s.choice_group_id = v_group.id AND s.id = ANY (v_ids);

      IF v_group.group_type = 'alternative' THEN
        IF v_selected <> 1 THEN
          RETURN jsonb_build_object('error', format('Escolha exatamente 1 opcao em "%s".', v_group.title));
        END IF;
      ELSE
        IF v_selected < COALESCE(v_group.min_select, 0) THEN
          RETURN jsonb_build_object('error', format('Escolha pelo menos %s opcao(oes) em "%s".', v_group.min_select, v_group.title));
        END IF;
        IF v_group.max_select IS NOT NULL AND v_selected > v_group.max_select THEN
          RETURN jsonb_build_object('error', format('Escolha no maximo %s opcao(oes) em "%s".', v_group.max_select, v_group.title));
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- versionamento: por cliente vinculado, ou por contato no fallback
  SELECT * INTO v_prev FROM public.quote_booking_requests r
  WHERE r.quote_id = v_quote.id
    AND (
      (v_client_id IS NOT NULL AND r.client_id = v_client_id)
      OR (v_client_id IS NULL AND (
            (length(v_email_norm) > 0 AND lower(btrim(COALESCE(r.client_email, ''))) = v_email_norm)
            OR (length(v_whats_norm) > 0 AND public._normalize_phone(r.client_whatsapp) = public._normalize_phone(v_whats_norm))
          ))
    )
    AND r.status NOT IN ('converted','cancelled','expired','superseded','accepted')
  ORDER BY r.version DESC, r.created_at DESC
  LIMIT 1;

  IF v_prev.id IS NOT NULL THEN
    v_root := COALESCE(v_prev.root_request_id, v_prev.id);
    SELECT COALESCE(max(version), 0) + 1 INTO v_version
    FROM public.quote_booking_requests WHERE root_request_id = v_root OR id = v_root;
  END IF;

  v_protocol := public.generate_booking_request_protocol();

  INSERT INTO public.quote_booking_requests (
    root_request_id, version, quote_id, user_id, agency_id, client_id, opportunity_id,
    protocol, status, client_name, client_email, client_whatsapp, client_notes,
    disclaimer_accepted_at, disclaimer_text_snapshot, currency, total_estimated,
    expires_at, idempotency_key, source_ip_hash
  ) VALUES (
    v_root, v_version, v_quote.id, v_quote.user_id, v_agency, v_client_id, NULL,
    v_protocol, 'received', v_name, v_email_norm, v_whats_norm,
    NULLIF(btrim(COALESCE(p_client_notes, '')), ''),
    now(), COALESCE(v_quote.booking_disclaimer, ''), COALESCE(v_quote.currency, 'BRL'), 0,
    v_expires, btrim(p_idempotency_key), p_source_ip_hash
  )
  RETURNING id, public_access_token INTO v_request_id, v_token;

  IF v_root IS NULL THEN
    UPDATE public.quote_booking_requests SET root_request_id = v_request_id WHERE id = v_request_id;
    v_root := v_request_id;
  END IF;

  INSERT INTO public.quote_booking_request_items (
    request_id, source_quote_service_id, service_type, service_name, snapshot,
    amount_snapshot, selection_mode_snapshot, choice_group_snapshot, quantity
  )
  SELECT
    v_request_id,
    s.id,
    s.service_type,
    COALESCE(NULLIF(btrim(COALESCE(s.option_label, '')), ''), s.service_type),
    to_jsonb(s) - 'created_at' - 'updated_at',
    COALESCE(s.amount, 0),
    COALESCE(s.selection_mode, 'optional'),
    CASE WHEN g.id IS NULL THEN NULL ELSE jsonb_build_object(
      'id', g.id, 'title', g.title, 'group_type', g.group_type,
      'min_select', g.min_select, 'max_select', g.max_select
    ) END,
    1
  FROM public.quote_services s
  LEFT JOIN public.quote_service_choice_groups g ON g.id = s.choice_group_id
  WHERE s.quote_id = v_quote.id AND s.id = ANY (v_ids);

  SELECT COALESCE(sum(amount_snapshot * quantity), 0), count(*)
  INTO v_items_sum, v_count
  FROM public.quote_booking_request_items WHERE request_id = v_request_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhum servico valido para o pedido';
  END IF;

  IF v_is_package THEN
    v_total := COALESCE(
      NULLIF(v_quote.package_total_amount, 0),
      NULLIF(v_quote.total_amount, 0),
      v_items_sum
    );
  ELSE
    v_total := v_items_sum;
  END IF;

  UPDATE public.quote_booking_requests
  SET total_estimated = GREATEST(COALESCE(v_total, 0), 0)
  WHERE id = v_request_id;

  INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
  VALUES (v_request_id, 'client', 'request_received', jsonb_build_object(
    'version', v_version, 'items', v_count, 'total_estimated', v_total,
    'items_sum', v_items_sum,
    'pricing_mode', COALESCE(v_quote.pricing_mode, 'itemized'),
    'hides_individual_amounts', v_hides_amounts,
    'currency', COALESCE(v_quote.currency, 'BRL'), 'quote_id', v_quote.id
  ));

  IF v_prev.id IS NOT NULL THEN
    UPDATE public.quote_booking_requests SET status = 'superseded' WHERE id = v_prev.id;
    INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
    VALUES (v_prev.id, 'system', 'request_superseded', jsonb_build_object(
      'superseded_by', v_request_id, 'new_version', v_version
    ));
  END IF;

  -- CRM: uma unica oportunidade correta (nunca cliente novo quando ha client_id)
  IF v_client_id IS NOT NULL THEN
    v_opportunity_id := public.sync_booking_request_opportunity(v_request_id);
  ELSE
    -- fallback legado: lead sem cliente cadastrado
    SELECT c.opportunity_id INTO v_opportunity_id
    FROM public.ensure_client_and_opportunity_for_lead(
      v_quote.user_id, v_name, v_whats_norm, v_email_norm,
      COALESCE(v_quote.destination, v_quote.trip_title)
    ) c;

    UPDATE public.quote_booking_requests r
    SET opportunity_id = v_opportunity_id,
        client_id = COALESCE(r.client_id, (SELECT o.client_id FROM public.opportunities o WHERE o.id = v_opportunity_id))
    WHERE r.id = v_request_id;

    IF v_opportunity_id IS NOT NULL THEN
      v_opportunity_id := public.sync_booking_request_opportunity(v_request_id);
    END IF;
  END IF;

  -- Avisos
  INSERT INTO public.quote_booking_request_deliveries (
    request_id, agency_id, channel, recipient_kind, status, sent_at
  ) VALUES (v_request_id, v_agency, 'internal', 'agency', 'sent', now())
  ON CONFLICT DO NOTHING;

  INSERT INTO public.quote_booking_request_deliveries (
    request_id, agency_id, channel, recipient_kind, status
  ) VALUES (v_request_id, v_agency, 'email', 'agency', 'pending')
  ON CONFLICT DO NOTHING;

  IF v_quote.user_id IS NOT NULL AND v_quote.user_id IS DISTINCT FROM v_agency THEN
    INSERT INTO public.quote_booking_request_deliveries (
      request_id, agency_id, channel, recipient_kind, status
    ) VALUES (v_request_id, v_agency, 'email', 'consultant', 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  IF length(v_email_norm) > 0 THEN
    INSERT INTO public.quote_booking_request_deliveries (
      request_id, agency_id, channel, recipient_kind, recipient_email, status
    ) VALUES (v_request_id, v_agency, 'email', 'client', v_email_norm, 'pending')
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.quote_booking_request_deliveries (
    request_id, agency_id, channel, recipient_kind, recipient_phone, status, skipped_reason
  ) VALUES (
    v_request_id, v_agency, 'whatsapp', 'agency', NULL, 'skipped',
    'Nenhuma integracao de WhatsApp configurada para esta agencia.'
  )
  ON CONFLICT DO NOTHING;

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'protocol', v_protocol,
    'version', v_version,
    'status', 'received',
    'total_estimated', GREATEST(COALESCE(v_total, 0), 0),
    'currency', COALESCE(v_quote.currency, 'BRL'),
    'public_access_token', v_token,
    'opportunity_id', v_opportunity_id,
    'duplicate', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) TO service_role;

-- ---------- 5) payload publico: sinaliza cliente vinculado SEM expor contatos ----------
CREATE OR REPLACE FUNCTION public.get_quote_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
  agent_record RECORD;
  services_data json;
  sections_data json;
  groups_data json;
  agent_profile json;
  quote_json jsonb;
  v_agency uuid;
  v_booking_enabled boolean := false;
BEGIN
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO quote_record
  FROM public.quotes
  WHERE public_access_code = p_code
    AND status = 'published';

  IF quote_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT * INTO agent_record
  FROM public.profiles
  WHERE user_id = quote_record.user_id;

  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  IF NOT public.agency_public_slug_matches(quote_record.user_id, p_agency_slug) THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.quote_services s WHERE s.quote_id = quote_record.id;

  SELECT json_agg(json_build_object(
    'id', sec.id,
    'quote_id', sec.quote_id,
    'title', sec.title,
    'order_index', sec.order_index
  ) ORDER BY sec.order_index) INTO sections_data
  FROM public.quote_sections sec WHERE sec.quote_id = quote_record.id;

  SELECT json_agg(json_build_object(
    'id', g.id,
    'title', g.title,
    'group_type', g.group_type,
    'min_select', g.min_select,
    'max_select', g.max_select,
    'order_index', g.order_index
  ) ORDER BY g.order_index) INTO groups_data
  FROM public.quote_service_choice_groups g WHERE g.quote_id = quote_record.id;

  IF COALESCE(quote_record.booking_requests_enabled, false) THEN
    v_agency := public.resolve_agency_id_for_user(quote_record.user_id);
    v_booking_enabled := public.agency_can_use_booking_requests(v_agency);
  END IF;

  -- client_id NUNCA vai para o navegador: apenas o sinal de que existe cadastro.
  quote_json := (to_jsonb(quote_record) - 'client_id')
    || jsonb_build_object(
         'booking_requests_enabled', v_booking_enabled,
         'has_linked_client', quote_record.client_id IS NOT NULL
       );

  agent_profile := json_build_object(
    'name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url,
    'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url,
    'city', agent_record.city, 'state', agent_record.state
  );

  RETURN json_build_object(
    'quote', quote_json,
    'services', COALESCE(services_data, '[]'::json),
    'sections', COALESCE(sections_data, '[]'::json),
    'choice_groups', COALESCE(groups_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$function$;

-- ---------- 6) conversao: Operacao recebe SOMENTE os itens do pedido ativo ----------
CREATE OR REPLACE FUNCTION public.import_booking_request_into_operation(p_operation_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_op RECORD;
  v_req RECORD;
  v_item RECORD;
  v_service_id uuid;
  v_total numeric := 0;
  v_created integer := 0;
  v_pos integer := 0;
BEGIN
  SELECT * INTO v_op FROM public.operations WHERE id = p_operation_id FOR UPDATE;
  IF v_op.id IS NULL OR v_op.opportunity_id IS NULL THEN RETURN 0; END IF;

  -- pedido ATIVO mais recente da oportunidade
  SELECT * INTO v_req
  FROM public.quote_booking_requests r
  WHERE r.opportunity_id = v_op.opportunity_id
    AND r.status NOT IN ('superseded', 'cancelled', 'expired')
  ORDER BY r.version DESC, r.created_at DESC
  LIMIT 1;
  IF v_req.id IS NULL THEN RETURN 0; END IF;

  SELECT COALESCE(sum(i.amount_snapshot * GREATEST(i.quantity, 1)), 0) INTO v_total
  FROM public.quote_booking_request_items i WHERE i.request_id = v_req.id;

  UPDATE public.operations
  SET quote_id = COALESCE(quote_id, v_req.quote_id),
      sale_amount = GREATEST(COALESCE(NULLIF(v_req.total_estimated, 0), v_total, 0), 0),
      updated_at = now()
  WHERE id = v_op.id;

  SELECT COALESCE(max(position), -1) INTO v_pos
  FROM public.operation_services WHERE operation_id = v_op.id;

  FOR v_item IN
    SELECT i.* FROM public.quote_booking_request_items i
    WHERE i.request_id = v_req.id
    ORDER BY i.created_at ASC
  LOOP
    -- idempotencia: item ja convertido OU servico equivalente ja existe
    IF v_item.operation_service_id IS NOT NULL
       AND EXISTS (SELECT 1 FROM public.operation_services os WHERE os.id = v_item.operation_service_id) THEN
      CONTINUE;
    END IF;

    SELECT os.id INTO v_service_id
    FROM public.operation_services os
    WHERE os.operation_id = v_op.id
      AND v_item.source_quote_service_id IS NOT NULL
      AND os.source_quote_service_id = v_item.source_quote_service_id
    LIMIT 1;

    IF v_service_id IS NULL THEN
      v_pos := v_pos + 1;
      INSERT INTO public.operation_services (
        operation_id, user_id, source_quote_service_id, service_type, name,
        destination, start_date, end_date, amount, service_data,
        is_confirmed, is_paid, is_issued, is_delivered, position, notes
      ) VALUES (
        v_op.id, v_op.user_id, v_item.source_quote_service_id,
        COALESCE(NULLIF(btrim(COALESCE(v_item.service_type, '')), ''), 'other'),
        COALESCE(NULLIF(btrim(COALESCE(v_item.service_name, '')), ''), 'Serviço'),
        v_op.destination, v_op.travel_start_date, v_op.travel_end_date,
        COALESCE(v_item.amount_snapshot, 0) * GREATEST(COALESCE(v_item.quantity, 1), 1),
        COALESCE(v_item.snapshot->'service_data', v_item.snapshot, '{}'::jsonb),
        false, false, false, false, v_pos,
        format('Importado da solicitacao de reserva %s. Reconfirmar disponibilidade e valores.', v_req.protocol)
      )
      RETURNING id INTO v_service_id;
      v_created := v_created + 1;
    END IF;

    UPDATE public.quote_booking_request_items
    SET operation_service_id = v_service_id, updated_at = now()
    WHERE id = v_item.id;
  END LOOP;

  RETURN v_created;
END;
$$;

REVOKE ALL ON FUNCTION public.import_booking_request_into_operation(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.import_booking_request_into_operation(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.trg_import_booking_request_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.import_booking_request_into_operation(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_operations_import_booking_request ON public.operations;
CREATE TRIGGER trg_operations_import_booking_request
AFTER INSERT ON public.operations
FOR EACH ROW EXECUTE FUNCTION public.trg_import_booking_request_services();

-- ---------- 7) backfill idempotente do pedido real de teste ----------
DO $backfill$
DECLARE
  v_req uuid := 'aafa561c-d018-4e75-8e6a-6e62878cf2ef';
  v_opp uuid;
BEGIN
  IF EXISTS (SELECT 1 FROM public.quote_booking_requests WHERE id = v_req) THEN
    v_opp := public.sync_booking_request_opportunity(v_req);
    RAISE NOTICE 'backfill opportunity: %', v_opp;
  END IF;
END
$backfill$;