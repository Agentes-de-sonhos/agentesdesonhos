-- =============================================================
-- CORRECAO DE REVISAO: pedido de reserva pelo orcamento web
-- 1) slug White Label validado por agency_public_domains (fallback seguro)
-- 2) avisos para a agencia titular + consultor autor quando distintos
-- 3) WhatsApp skipped sem telefone do cliente como destinatario da agencia
-- Idempotente: apenas CREATE OR REPLACE / helper novo. Nao cria dados.
-- =============================================================

CREATE OR REPLACE FUNCTION public.agency_public_slug_matches(
  p_quote_user_id uuid,
  p_slug text
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH ag AS (
    SELECT public.resolve_agency_id_for_user(p_quote_user_id) AS agency_id
  )
  SELECT CASE
    WHEN COALESCE(lower(btrim(p_slug)), '') = '' THEN false
    ELSE
      EXISTS (
        SELECT 1
        FROM public.agency_public_domains d, ag
        WHERE d.is_active
          AND lower(btrim(d.agency_slug)) = lower(btrim(p_slug))
          AND (
            d.user_id = ag.agency_id
            OR public.resolve_agency_id_for_user(d.user_id) = ag.agency_id
          )
      )
      OR lower(btrim(p_slug)) = COALESCE(
           (SELECT public.get_agency_slug_for_user(ag.agency_id) FROM ag), '')
      OR lower(btrim(p_slug)) = COALESCE(
           public.get_agency_slug_for_user(p_quote_user_id), '')
  END;
$function$;

REVOKE ALL ON FUNCTION public.agency_public_slug_matches(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agency_public_slug_matches(uuid, text) TO service_role;

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
  v_slug text;
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
  v_crm RECORD;
  v_service_names text;
BEGIN
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 THEN
    RETURN jsonb_build_object('error', 'Requisicao invalida.');
  END IF;

  -- Replay idempotente: devolve o mesmo pedido e NAO repete CRM/avisos
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

  v_name := btrim(COALESCE(p_client_name, ''));
  v_email_norm := lower(btrim(COALESCE(p_client_email, '')));
  v_whats_norm := btrim(COALESCE(p_client_whatsapp, ''));

  IF length(v_name) < 2 THEN
    RETURN jsonb_build_object('error', 'Informe seu nome completo.');
  END IF;
  IF length(v_email_norm) = 0 AND length(v_whats_norm) = 0 THEN
    RETURN jsonb_build_object('error', 'Informe WhatsApp ou e-mail para a agencia entrar em contato.');
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

  -- Slug: valida contra dominio White Label ativo da agencia resolvida,
  -- com fallback seguro para o slug derivado (links publicos antigos).
  IF NOT public.agency_public_slug_matches(v_quote.user_id, p_agency_slug) THEN
    RETURN jsonb_build_object('error', 'Orcamento nao encontrado.');
  END IF;

  -- flag do orcamento + elegibilidade (Premium ativo + White Label ativo)
  v_agency := public.resolve_agency_id_for_user(v_quote.user_id);
  IF COALESCE(v_quote.booking_requests_enabled, false) = false
     OR NOT public.agency_can_use_booking_requests(v_agency) THEN
    RETURN jsonb_build_object('error', 'Este orcamento nao aceita pedidos de reserva.');
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
    -- Pacote fechado: conjunto completo, sem retirar itens mantendo o valor
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

  -- versionamento por contato (e-mail OU whatsapp)
  SELECT * INTO v_prev FROM public.quote_booking_requests r
  WHERE r.quote_id = v_quote.id
    AND (
      (length(v_email_norm) > 0 AND lower(btrim(COALESCE(r.client_email, ''))) = v_email_norm)
      OR (length(v_whats_norm) > 0 AND public._normalize_phone(r.client_whatsapp) = public._normalize_phone(v_whats_norm))
    )
    AND r.status NOT IN ('converted','cancelled','expired','superseded','accepted')
  ORDER BY r.version DESC, r.created_at DESC
  LIMIT 1;

  IF v_prev.id IS NOT NULL THEN
    v_root := COALESCE(v_prev.root_request_id, v_prev.id);
    SELECT COALESCE(max(version), 0) + 1 INTO v_version
    FROM public.quote_booking_requests WHERE root_request_id = v_root OR id = v_root;
  END IF;

  -- CRM: reaproveita cliente/oportunidade do orcamento; senao usa o dedupe existente
  v_client_id := v_quote.client_id;
  v_opportunity_id := v_quote.opportunity_id;

  IF v_opportunity_id IS NOT NULL THEN
    PERFORM 1 FROM public.opportunities o
      WHERE o.id = v_opportunity_id AND o.user_id = v_quote.user_id;
    IF NOT FOUND THEN
      v_opportunity_id := NULL;
    END IF;
  END IF;

  IF v_opportunity_id IS NULL THEN
    SELECT * INTO v_crm FROM public.ensure_client_and_opportunity_for_lead(
      v_quote.user_id,
      COALESCE(NULLIF(v_name, ''), COALESCE(v_quote.client_name, 'Cliente do orcamento')),
      v_whats_norm,
      v_email_norm,
      COALESCE(v_quote.destination, v_quote.trip_title)
    );
    v_client_id := COALESCE(v_client_id, v_crm.client_id);
    v_opportunity_id := v_crm.opportunity_id;
  END IF;

  v_protocol := public.generate_booking_request_protocol();

  INSERT INTO public.quote_booking_requests (
    root_request_id, version, quote_id, user_id, agency_id, client_id, opportunity_id,
    protocol, status, client_name, client_email, client_whatsapp, client_notes,
    disclaimer_accepted_at, disclaimer_text_snapshot, currency, total_estimated,
    expires_at, idempotency_key, source_ip_hash
  ) VALUES (
    v_root, v_version, v_quote.id, v_quote.user_id, v_agency, v_client_id, v_opportunity_id,
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

  -- Total conforme o modelo financeiro realmente apresentado ao cliente
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

  -- CRM: historico + tarefa de retorno
  SELECT string_agg(i.service_name, ', ' ORDER BY i.service_name) INTO v_service_names
  FROM public.quote_booking_request_items i WHERE i.request_id = v_request_id;

  IF v_opportunity_id IS NOT NULL THEN
    INSERT INTO public.opportunity_history (opportunity_id, from_stage, to_stage, notes)
    SELECT v_opportunity_id, o.stage, o.stage, format(
      'Solicitacao de reserva %s (v%s) recebida pelo orcamento web em %s. Servicos: %s. Valor apresentado: %s %s. Contato: %s. Status: Aguardando reconfirmacao.',
      v_protocol, v_version, to_char(now(), 'DD/MM/YYYY HH24:MI'),
      COALESCE(v_service_names, '-'),
      COALESCE(v_quote.currency, 'BRL'), to_char(COALESCE(v_total, 0), 'FM999G999G990D00'),
      concat_ws(' / ', NULLIF(v_whats_norm, ''), NULLIF(v_email_norm, ''))
    )
    FROM public.opportunities o WHERE o.id = v_opportunity_id;

    INSERT INTO public.opportunity_followups (opportunity_id, user_id, follow_up_date, note)
    VALUES (
      v_opportunity_id, v_quote.user_id, (now() + interval '1 day')::date,
      format('Retornar sobre a solicitacao de reserva %s (reconfirmar servicos, disponibilidade e valores).', v_protocol)
    );

    UPDATE public.opportunities
    SET updated_at = now()
    WHERE id = v_opportunity_id;
  END IF;

  -- Avisos: interno sempre; e-mail para a agencia titular; consultor autor quando
  -- diferente do titular; cliente quando houver e-mail. WhatsApp so com integracao real.
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

  -- WhatsApp permanece 'skipped': nao ha integracao. NUNCA gravar o telefone do
  -- cliente como telefone destinatario da agencia.
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
REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) TO service_role;

-- =============================================================
-- Leitura publica do orcamento usa a mesma validacao de slug
-- =============================================================
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

  -- flag efetiva: orçamento marcado E agência Premium com White Label ativo
  IF COALESCE(quote_record.booking_requests_enabled, false) THEN
    v_agency := public.resolve_agency_id_for_user(quote_record.user_id);
    v_booking_enabled := public.agency_can_use_booking_requests(v_agency);
  END IF;

  quote_json := to_jsonb(quote_record)
    || jsonb_build_object('booking_requests_enabled', v_booking_enabled);

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

-- =============================================================
-- Fila de e-mails: devolve o user id CORRETO por recipient_kind
-- =============================================================
CREATE OR REPLACE FUNCTION public.pending_booking_request_deliveries(p_request_id uuid)
RETURNS TABLE (
  delivery_id uuid,
  channel text,
  recipient_kind text,
  recipient_email text,
  protocol text,
  version integer,
  status text,
  client_name text,
  client_email text,
  client_whatsapp text,
  client_notes text,
  currency text,
  total_estimated numeric,
  quote_id uuid,
  destination text,
  trip_title text,
  agency_name text,
  agency_user_id uuid,
  opportunity_id uuid,
  service_names text
)
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  WITH claimed AS (
    UPDATE public.quote_booking_request_deliveries d
    SET attempts = d.attempts + 1, updated_at = now()
    WHERE d.request_id = p_request_id
      AND d.status = 'pending'
      AND d.channel = 'email'
    RETURNING d.id, d.channel, d.recipient_kind, d.recipient_email, d.request_id
  )
  SELECT c.id, c.channel, c.recipient_kind, c.recipient_email,
         r.protocol, r.version, r.status, r.client_name, r.client_email, r.client_whatsapp,
         r.client_notes, r.currency, r.total_estimated, r.quote_id,
         q.destination, q.trip_title,
         COALESCE(owner_p.agency_name, author_p.agency_name),
         CASE c.recipient_kind
           WHEN 'agency' THEN r.agency_id
           WHEN 'consultant' THEN r.user_id
           ELSE NULL::uuid
         END,
         r.opportunity_id,
         (SELECT string_agg(i.service_name, ', ' ORDER BY i.service_name)
            FROM public.quote_booking_request_items i WHERE i.request_id = r.id)
  FROM claimed c
  JOIN public.quote_booking_requests r ON r.id = c.request_id
  JOIN public.quotes q ON q.id = r.quote_id
  LEFT JOIN public.profiles owner_p ON owner_p.user_id = r.agency_id
  LEFT JOIN public.profiles author_p ON author_p.user_id = r.user_id;
$$;

REVOKE ALL ON FUNCTION public.pending_booking_request_deliveries(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pending_booking_request_deliveries(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_booking_request_deliveries(uuid) TO service_role;