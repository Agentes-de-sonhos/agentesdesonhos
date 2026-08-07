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
  v_ids uuid[];
  v_total numeric := 0;
  v_count integer := 0;
  v_expires timestamptz;
  v_group RECORD;
  v_selected integer;
BEGIN
  -- idempotência: replay devolve o mesmo pedido
  IF p_idempotency_key IS NULL OR length(btrim(p_idempotency_key)) < 8 THEN
    RETURN jsonb_build_object('error', 'Requisição inválida.');
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
    RETURN jsonb_build_object('error', 'É necessário aceitar o aviso de que o pedido não confirma a reserva.');
  END IF;
  IF COALESCE(length(btrim(p_client_name)), 0) = 0
     OR COALESCE(length(btrim(p_client_email)), 0) = 0
     OR COALESCE(length(btrim(p_client_whatsapp)), 0) = 0 THEN
    RETURN jsonb_build_object('error', 'Informe nome, e-mail e WhatsApp.');
  END IF;
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN jsonb_build_object('error', 'Link inválido.');
  END IF;

  -- orçamento publicado + lock da linha (serializa versões concorrentes)
  SELECT * INTO v_quote FROM public.quotes
  WHERE public_access_code = p_code AND status = 'published'
  FOR UPDATE;
  IF v_quote.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Orçamento não encontrado.');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_quote.user_id;
  IF v_profile.user_id IS NULL THEN
    RETURN jsonb_build_object('error', 'Orçamento não encontrado.');
  END IF;

  v_slug := lower(public.unaccent(COALESCE(v_profile.agency_name, '')));
  v_slug := regexp_replace(v_slug, '[^a-z0-9\-]', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  IF v_slug <> COALESCE(p_agency_slug, '') THEN
    RETURN jsonb_build_object('error', 'Orçamento não encontrado.');
  END IF;

  -- recurso liberado (flag + entitlement no momento do envio)
  v_agency := public.resolve_agency_id_for_user(v_quote.user_id);
  IF COALESCE(v_quote.booking_requests_enabled, false) = false
     OR NOT public.agency_has_entitlement(v_agency, 'booking_requests') THEN
    RETURN jsonb_build_object('error', 'Este orçamento não aceita pedidos de reserva.');
  END IF;

  -- prazo: válido até o fim do dia informado
  IF v_quote.booking_deadline IS NOT NULL THEN
    IF now() > ((v_quote.booking_deadline::date + 1)::timestamptz) THEN
      RETURN jsonb_build_object('error', 'O prazo para solicitar a reserva deste orçamento terminou.');
    END IF;
    v_expires := (v_quote.booking_deadline::date + 1)::timestamptz;
  END IF;

  -- normaliza seleção: dedup + só serviços deste orçamento + required automáticos
  SELECT COALESCE(array_agg(DISTINCT s.id), '{}'::uuid[]) INTO v_ids
  FROM public.quote_services s
  WHERE s.quote_id = v_quote.id
    AND (
      s.id = ANY (COALESCE(p_selected_service_ids, '{}'::uuid[]))
      OR COALESCE(s.selection_mode, 'optional') = 'required'
    );

  IF array_length(v_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('error', 'Selecione pelo menos um serviço.');
  END IF;

  -- grupos: alternative = exatamente 1; free = respeita min/max
  FOR v_group IN
    SELECT g.* FROM public.quote_service_choice_groups g WHERE g.quote_id = v_quote.id
  LOOP
    SELECT count(*) INTO v_selected
    FROM public.quote_services s
    WHERE s.quote_id = v_quote.id AND s.choice_group_id = v_group.id AND s.id = ANY (v_ids);

    IF v_group.group_type = 'alternative' THEN
      IF v_selected <> 1 THEN
        RETURN jsonb_build_object('error', format('Escolha exatamente 1 opção em "%s".', v_group.title));
      END IF;
    ELSE
      IF v_selected < COALESCE(v_group.min_select, 0) THEN
        RETURN jsonb_build_object('error', format('Escolha pelo menos %s opção(ões) em "%s".', v_group.min_select, v_group.title));
      END IF;
      IF v_group.max_select IS NOT NULL AND v_selected > v_group.max_select THEN
        RETURN jsonb_build_object('error', format('Escolha no máximo %s opção(ões) em "%s".', v_group.max_select, v_group.title));
      END IF;
    END IF;
  END LOOP;

  -- versionamento: pedido anterior não-terminal do mesmo quote + mesmo e-mail
  v_email_norm := lower(btrim(p_client_email));
  SELECT * INTO v_prev FROM public.quote_booking_requests r
  WHERE r.quote_id = v_quote.id
    AND lower(btrim(r.client_email)) = v_email_norm
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
    v_root, v_version, v_quote.id, v_quote.user_id, v_agency, v_quote.client_id, v_quote.opportunity_id,
    v_protocol, 'received', btrim(p_client_name), v_email_norm, btrim(p_client_whatsapp),
    NULLIF(btrim(COALESCE(p_client_notes, '')), ''),
    now(), COALESCE(v_quote.booking_disclaimer, ''), COALESCE(v_quote.currency, 'BRL'), 0,
    v_expires, btrim(p_idempotency_key), p_source_ip_hash
  )
  RETURNING id, public_access_token INTO v_request_id, v_token;

  IF v_root IS NULL THEN
    UPDATE public.quote_booking_requests SET root_request_id = v_request_id WHERE id = v_request_id;
    v_root := v_request_id;
  END IF;

  -- snapshot dos itens a partir das linhas reais
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
  INTO v_total, v_count
  FROM public.quote_booking_request_items WHERE request_id = v_request_id;

  IF v_count = 0 THEN
    RAISE EXCEPTION 'Nenhum serviço válido para o pedido';
  END IF;

  UPDATE public.quote_booking_requests
  SET total_estimated = v_total
  WHERE id = v_request_id;

  INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
  VALUES (v_request_id, 'client', 'request_received', jsonb_build_object(
    'version', v_version, 'items', v_count, 'total_estimated', v_total,
    'currency', COALESCE(v_quote.currency, 'BRL'), 'quote_id', v_quote.id
  ));

  IF v_prev.id IS NOT NULL THEN
    UPDATE public.quote_booking_requests SET status = 'superseded' WHERE id = v_prev.id;
    INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
    VALUES (v_prev.id, 'system', 'request_superseded', jsonb_build_object(
      'superseded_by', v_request_id, 'new_version', v_version
    ));
  END IF;

  RETURN jsonb_build_object(
    'request_id', v_request_id,
    'protocol', v_protocol,
    'version', v_version,
    'status', 'received',
    'total_estimated', v_total,
    'currency', COALESCE(v_quote.currency, 'BRL'),
    'public_access_token', v_token,
    'duplicate', false
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM anon;
REVOKE ALL ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.submit_quote_booking_request(text, text, uuid[], text, text, text, text, boolean, text, text) TO service_role;
