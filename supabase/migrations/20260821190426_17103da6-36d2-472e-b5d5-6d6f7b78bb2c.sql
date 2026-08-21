CREATE OR REPLACE FUNCTION public.submit_quote_booking_request(p_agency_slug text, p_code text, p_selected_service_ids uuid[], p_client_name text, p_client_email text, p_client_whatsapp text, p_client_notes text DEFAULT NULL::text, p_disclaimer_accepted boolean DEFAULT false, p_idempotency_key text DEFAULT NULL::text, p_source_ip_hash text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
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
  v_min integer;
  v_max integer;
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

      -- Obrigatoriedade vem SEMPRE de min_select/max_select, nunca do group_type.
      -- Escolha unica opcional     = min 0 / max 1
      -- Escolha unica obrigatoria  = min 1 / max 1
      v_min := GREATEST(COALESCE(v_group.min_select, 0), 0);
      IF v_group.group_type = 'alternative' THEN
        v_max := COALESCE(v_group.max_select, 1);
        v_min := LEAST(v_min, 1);
      ELSE
        v_max := v_group.max_select;
      END IF;

      IF v_selected < v_min THEN
        RETURN jsonb_build_object('error', format('Escolha pelo menos %s opcao(oes) em "%s".', v_min, v_group.title));
      END IF;
      IF v_max IS NOT NULL AND v_selected > v_max THEN
        RETURN jsonb_build_object('error', format('Escolha no maximo %s opcao(oes) em "%s".', v_max, v_group.title));
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

  IF length(v_email_norm) > 0 THEN
    INSERT INTO public.quote_booking_request_deliveries (
      request_id, agency_id, channel, recipient_kind, recipient_email, status
    )
    VALUES (v_request_id, v_agency, 'email', 'client', v_email_norm, 'pending')
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

CREATE OR REPLACE FUNCTION public.normalize_quote_choice_group()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Escolha unica: no maximo 1 opcao. O minimo define se o conjunto e
  -- obrigatorio (1) ou opcional (0) -- nunca inferido pelo tipo do grupo.
  IF NEW.group_type = 'alternative' THEN
    NEW.max_select := 1;
    NEW.min_select := LEAST(GREATEST(COALESCE(NEW.min_select, 1), 0), 1);
  END IF;

  SELECT q.user_id INTO NEW.user_id FROM public.quotes q WHERE q.id = NEW.quote_id;
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento inválido para o grupo de escolha';
  END IF;

  RETURN NEW;
END;
$function$;