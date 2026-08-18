-- =============================================================
-- 1) ELEGIBILIDADE: Premium ativo + White Label ativo
-- =============================================================
CREATE OR REPLACE FUNCTION public.agency_can_use_booking_requests(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _agency_id
        AND s.is_active
        AND s.plan = 'premium'::subscription_plan
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
    AND EXISTS (
      SELECT 1 FROM public.agency_public_domains d
      WHERE d.user_id = _agency_id
        AND d.is_active
    );
$$;

CREATE OR REPLACE FUNCTION public.current_agency_can_use_booking_requests()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN false
    ELSE public.agency_can_use_booking_requests(public.resolve_agency_id_for_user(auth.uid()))
  END;
$$;

REVOKE ALL ON FUNCTION public.agency_can_use_booking_requests(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.current_agency_can_use_booking_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.agency_can_use_booking_requests(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.current_agency_can_use_booking_requests() TO authenticated, service_role;

-- Trigger de ativação por orçamento passa a usar a nova regra
CREATE OR REPLACE FUNCTION public.enforce_quote_booking_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid;
BEGIN
  IF COALESCE(NEW.booking_requests_enabled, false) = false THEN
    RETURN NEW;
  END IF;
  v_agency := public.resolve_agency_id_for_user(NEW.user_id);
  IF NOT public.agency_can_use_booking_requests(v_agency) THEN
    RAISE EXCEPTION 'Solicitacao de reserva disponivel apenas para agencias Premium com site White Label ativo';
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================
-- 2) CONTATO: nome + (WhatsApp OU e-mail)
-- =============================================================
ALTER TABLE public.quote_booking_requests
  DROP CONSTRAINT IF EXISTS quote_booking_requests_client_email_check,
  DROP CONSTRAINT IF EXISTS quote_booking_requests_client_whatsapp_check;

ALTER TABLE public.quote_booking_requests
  ALTER COLUMN client_email SET DEFAULT '',
  ALTER COLUMN client_whatsapp SET DEFAULT '';

ALTER TABLE public.quote_booking_requests
  ADD CONSTRAINT quote_booking_requests_contact_check
  CHECK (length(btrim(COALESCE(client_email, ''))) > 0 OR length(btrim(COALESCE(client_whatsapp, ''))) > 0);

-- =============================================================
-- 3) FILA DE AVISOS DO PEDIDO
-- =============================================================
CREATE TABLE IF NOT EXISTS public.quote_booking_request_deliveries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.quote_booking_requests(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('internal', 'email', 'whatsapp')),
  recipient_kind text NOT NULL CHECK (recipient_kind IN ('agency', 'consultant', 'client')),
  recipient_email text,
  recipient_phone text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  skipped_reason text,
  error_message text,
  provider_message_id text,
  attempts integer NOT NULL DEFAULT 0,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS quote_booking_request_deliveries_uidx
  ON public.quote_booking_request_deliveries (request_id, channel, recipient_kind, lower(COALESCE(recipient_email, '')));

CREATE INDEX IF NOT EXISTS quote_booking_request_deliveries_due_idx
  ON public.quote_booking_request_deliveries (status, created_at);

GRANT SELECT ON public.quote_booking_request_deliveries TO authenticated;
GRANT ALL ON public.quote_booking_request_deliveries TO service_role;

ALTER TABLE public.quote_booking_request_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS owner_can_view_booking_deliveries ON public.quote_booking_request_deliveries;
CREATE POLICY owner_can_view_booking_deliveries
  ON public.quote_booking_request_deliveries FOR SELECT TO authenticated
  USING (agency_id = auth.uid());

DROP POLICY IF EXISTS team_can_view_booking_deliveries ON public.quote_booking_request_deliveries;
CREATE POLICY team_can_view_booking_deliveries
  ON public.quote_booking_request_deliveries FOR SELECT TO authenticated
  USING (public.can_team('quotes.view') AND agency_id = public.resolve_agency_id_for_user(auth.uid()));

DROP POLICY IF EXISTS admins_can_view_booking_deliveries ON public.quote_booking_request_deliveries;
CREATE POLICY admins_can_view_booking_deliveries
  ON public.quote_booking_request_deliveries FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

DROP TRIGGER IF EXISTS update_booking_deliveries_updated_at ON public.quote_booking_request_deliveries;
CREATE TRIGGER update_booking_deliveries_updated_at
  BEFORE UPDATE ON public.quote_booking_request_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================
-- 4) RPC PRINCIPAL DE ENVIO (reescrita)
-- =============================================================
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

  v_slug := lower(public.unaccent(COALESCE(v_profile.agency_name, '')));
  v_slug := regexp_replace(v_slug, '[^a-z0-9\-]', '-', 'g');
  v_slug := regexp_replace(v_slug, '-+', '-', 'g');
  v_slug := trim(both '-' from v_slug);
  IF v_slug <> COALESCE(p_agency_slug, '') THEN
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

  -- Avisos: interno sempre; e-mail para a agencia; cliente quando houver e-mail; WhatsApp so com integracao
  INSERT INTO public.quote_booking_request_deliveries (
    request_id, agency_id, channel, recipient_kind, status, sent_at
  ) VALUES (v_request_id, v_agency, 'internal', 'agency', 'sent', now());

  INSERT INTO public.quote_booking_request_deliveries (
    request_id, agency_id, channel, recipient_kind, status
  ) VALUES (v_request_id, v_agency, 'email', 'agency', 'pending');

  IF length(v_email_norm) > 0 THEN
    INSERT INTO public.quote_booking_request_deliveries (
      request_id, agency_id, channel, recipient_kind, recipient_email, status
    ) VALUES (v_request_id, v_agency, 'email', 'client', v_email_norm, 'pending');
  END IF;

  INSERT INTO public.quote_booking_request_deliveries (
    request_id, agency_id, channel, recipient_kind, recipient_phone, status, skipped_reason
  ) VALUES (
    v_request_id, v_agency, 'whatsapp', 'agency', NULLIF(v_whats_norm, ''), 'skipped',
    'Nenhuma integracao de WhatsApp configurada para esta agencia.'
  );

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
-- 5) FLAG PUBLICA usa a nova elegibilidade
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
  agency_slug_check text;
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

  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);

  IF agency_slug_check != p_agency_slug THEN
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
-- 6) FILA DE E-MAIL: leitura e conclusao (apenas service_role)
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
         q.destination, q.trip_title, p.agency_name, r.user_id, r.opportunity_id,
         (SELECT string_agg(i.service_name, ', ' ORDER BY i.service_name)
            FROM public.quote_booking_request_items i WHERE i.request_id = r.id)
  FROM claimed c
  JOIN public.quote_booking_requests r ON r.id = c.request_id
  JOIN public.quotes q ON q.id = r.quote_id
  LEFT JOIN public.profiles p ON p.user_id = r.user_id;
$$;

CREATE OR REPLACE FUNCTION public.complete_booking_request_delivery(
  p_delivery_id uuid,
  p_status text,
  p_error text DEFAULT NULL,
  p_provider_message_id text DEFAULT NULL,
  p_recipient_email text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_status NOT IN ('sent', 'failed', 'skipped') THEN
    RAISE EXCEPTION 'Status de envio invalido';
  END IF;
  UPDATE public.quote_booking_request_deliveries
  SET status = p_status,
      error_message = p_error,
      provider_message_id = p_provider_message_id,
      recipient_email = COALESCE(recipient_email, p_recipient_email),
      skipped_reason = CASE WHEN p_status = 'skipped' THEN p_error ELSE skipped_reason END,
      sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END,
      updated_at = now()
  WHERE id = p_delivery_id;
END;
$$;

REVOKE ALL ON FUNCTION public.pending_booking_request_deliveries(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.pending_booking_request_deliveries(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_booking_request_deliveries(uuid) TO service_role;
REVOKE ALL ON FUNCTION public.complete_booking_request_delivery(uuid, text, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_booking_request_delivery(uuid, text, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_booking_request_delivery(uuid, text, text, text, text) TO service_role;

-- =============================================================
-- 7) AGENCIA REGISTRA INICIO DO ATENDIMENTO
-- =============================================================
CREATE OR REPLACE FUNCTION public.booking_request_start_review(p_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req RECORD;
  v_allowed boolean := false;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  SELECT * INTO v_req FROM public.quote_booking_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Solicitacao nao encontrada.');
  END IF;

  v_allowed := (v_req.user_id = auth.uid())
    OR (v_req.agency_id = auth.uid())
    OR (public.can_team('quotes.edit') AND v_req.agency_id = public.resolve_agency_id_for_user(auth.uid()));

  IF NOT v_allowed THEN
    RAISE EXCEPTION 'Nao autorizado';
  END IF;

  IF v_req.status <> 'received' THEN
    RETURN jsonb_build_object('status', v_req.status, 'changed', false);
  END IF;

  UPDATE public.quote_booking_requests
  SET status = 'under_review'
  WHERE id = p_request_id;

  INSERT INTO public.quote_booking_request_events (request_id, actor_type, actor_user_id, event_type, payload)
  VALUES (p_request_id, 'agency', auth.uid(), 'review_started', jsonb_build_object('from', v_req.status));

  RETURN jsonb_build_object('status', 'under_review', 'changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.booking_request_start_review(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_request_start_review(uuid) TO authenticated, service_role;