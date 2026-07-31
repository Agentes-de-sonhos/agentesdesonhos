-- 1. Team member notification e-mail (reuses existing team structure)
ALTER TABLE public.agency_team_members ADD COLUMN IF NOT EXISTS notification_email text;

-- 2. Assignment on leads / opportunities
ALTER TABLE public.product_landing_leads
  ADD COLUMN IF NOT EXISTS assigned_team_member_id uuid REFERENCES public.agency_team_members(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS assignment_reason text;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS assigned_team_member_id uuid REFERENCES public.agency_team_members(id) ON DELETE SET NULL;

-- 3. Notification settings (one row per landing)
CREATE TABLE IF NOT EXISTS public.product_landing_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id uuid NOT NULL UNIQUE REFERENCES public.agency_product_landings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email_enabled boolean NOT NULL DEFAULT false,
  include_owner boolean NOT NULL DEFAULT true,
  default_assignee_member_id uuid REFERENCES public.agency_team_members(id) ON DELETE SET NULL,
  notify_days text[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri']::text[],
  notify_start time NOT NULL DEFAULT '08:00',
  notify_end time NOT NULL DEFAULT '18:00',
  outside_behavior text NOT NULL DEFAULT 'next_window',
  allow_test_sends boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.product_landing_notification_settings TO authenticated;
GRANT ALL ON public.product_landing_notification_settings TO service_role;
ALTER TABLE public.product_landing_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency reads own landing notification settings"
  ON public.product_landing_notification_settings FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id = public.current_agency_id());

-- 4. Recipients
CREATE TABLE IF NOT EXISTS public.product_landing_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landing_id uuid NOT NULL REFERENCES public.agency_product_landings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'member',
  team_member_id uuid REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_landing_recipients_unique
  ON public.product_landing_notification_recipients (landing_id, lower(email));
GRANT SELECT ON public.product_landing_notification_recipients TO authenticated;
GRANT ALL ON public.product_landing_notification_recipients TO service_role;
ALTER TABLE public.product_landing_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency reads own landing recipients"
  ON public.product_landing_notification_recipients FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id = public.current_agency_id());

-- 5. Deliveries queue
CREATE TABLE IF NOT EXISTS public.product_landing_lead_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.product_landing_leads(id) ON DELETE CASCADE,
  landing_id uuid NOT NULL REFERENCES public.agency_product_landings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  channel text NOT NULL DEFAULT 'email',
  recipient_kind text NOT NULL DEFAULT 'member',
  recipient_member_id uuid REFERENCES public.agency_team_members(id) ON DELETE SET NULL,
  recipient_email text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  attempts integer NOT NULL DEFAULT 0,
  provider_message_id text,
  error_message text,
  scheduled_for timestamptz NOT NULL DEFAULT now(),
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS product_landing_delivery_unique
  ON public.product_landing_lead_deliveries (lead_id, lower(recipient_email));
CREATE INDEX IF NOT EXISTS product_landing_delivery_due
  ON public.product_landing_lead_deliveries (status, scheduled_for);
GRANT SELECT ON public.product_landing_lead_deliveries TO authenticated;
GRANT ALL ON public.product_landing_lead_deliveries TO service_role;
ALTER TABLE public.product_landing_lead_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency reads own lead deliveries"
  ON public.product_landing_lead_deliveries FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR user_id = public.current_agency_id());

CREATE TRIGGER trg_pl_notif_settings_updated
  BEFORE UPDATE ON public.product_landing_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_pl_deliveries_updated
  BEFORE UPDATE ON public.product_landing_lead_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 6. Window math: NULL means "inside a window right now" (send immediately)
CREATE OR REPLACE FUNCTION public.product_landing_next_notify_at(
  p_tz text, p_days text[], p_start time, p_end time, p_from timestamptz DEFAULT now()
) RETURNS timestamptz
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_tz text := COALESCE(NULLIF(p_tz,''), 'America/Sao_Paulo');
  v_local date;
  d date;
  i int;
  v_key text;
  v_start timestamptz;
  v_end timestamptz;
BEGIN
  IF p_days IS NULL OR array_length(p_days,1) IS NULL THEN RETURN NULL; END IF;
  BEGIN
    v_local := (p_from AT TIME ZONE v_tz)::date;
  EXCEPTION WHEN others THEN
    v_tz := 'America/Sao_Paulo';
    v_local := (p_from AT TIME ZONE v_tz)::date;
  END;

  FOR i IN -1..8 LOOP
    d := v_local + i;
    v_key := lower(to_char(d, 'dy'));
    IF v_key = ANY(p_days) THEN
      v_start := (d + p_start) AT TIME ZONE v_tz;
      IF p_end > p_start THEN
        v_end := (d + p_end) AT TIME ZONE v_tz;
      ELSE
        v_end := ((d + 1) + p_end) AT TIME ZONE v_tz;
      END IF;
      IF p_from >= v_start AND p_from < v_end THEN RETURN NULL; END IF;
      IF v_start > p_from THEN RETURN v_start; END IF;
    END IF;
  END LOOP;
  RETURN NULL;
END;
$$;

-- 7. Enqueue deliveries for a lead
CREATE OR REPLACE FUNCTION public.enqueue_product_landing_lead_notifications(p_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_set RECORD;
  v_when timestamptz;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_lead FROM public.product_landing_leads WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_set FROM public.product_landing_notification_settings WHERE landing_id = v_lead.landing_id;
  IF v_set.id IS NULL OR NOT v_set.email_enabled THEN RETURN 0; END IF;
  IF v_lead.is_test AND NOT v_set.allow_test_sends THEN RETURN 0; END IF;

  v_when := public.product_landing_next_notify_at(
    (SELECT timezone FROM public.agency_product_landings WHERE id = v_lead.landing_id),
    v_set.notify_days, v_set.notify_start, v_set.notify_end, now()
  );

  INSERT INTO public.product_landing_lead_deliveries (
    lead_id, landing_id, user_id, recipient_kind, recipient_member_id, recipient_email, status, scheduled_for
  )
  SELECT p_lead_id, v_lead.landing_id, v_lead.user_id, r.kind, r.team_member_id, r.email,
         CASE WHEN v_when IS NULL THEN 'pending' ELSE 'scheduled' END,
         COALESCE(v_when, now())
  FROM public.product_landing_notification_recipients r
  WHERE r.landing_id = v_lead.landing_id
    AND r.active
    AND r.email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_count FROM public.product_landing_lead_deliveries WHERE lead_id = p_lead_id;
  RETURN v_count;
END;
$$;
REVOKE ALL ON FUNCTION public.enqueue_product_landing_lead_notifications(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_product_landing_lead_notifications(uuid) TO service_role;

-- 8. Owner-only configuration read/write
CREATE OR REPLACE FUNCTION public.get_product_landing_notifications(p_landing_id uuid)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_tz text;
  v_set RECORD;
  v_owner_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','Não autorizado'); END IF;
  SELECT user_id, timezone INTO v_owner, v_tz FROM public.agency_product_landings WHERE id = p_landing_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RETURN json_build_object('error','Não autorizado'); END IF;

  SELECT email INTO v_owner_email FROM auth.users WHERE id = v_owner;
  SELECT * INTO v_set FROM public.product_landing_notification_settings WHERE landing_id = p_landing_id;

  RETURN json_build_object(
    'landing_id', p_landing_id,
    'timezone', v_tz,
    'owner_email', v_owner_email,
    'settings', CASE WHEN v_set.id IS NULL THEN NULL ELSE json_build_object(
      'email_enabled', v_set.email_enabled,
      'include_owner', v_set.include_owner,
      'default_assignee_member_id', v_set.default_assignee_member_id,
      'notify_days', v_set.notify_days,
      'notify_start', to_char(v_set.notify_start,'HH24:MI'),
      'notify_end', to_char(v_set.notify_end,'HH24:MI'),
      'outside_behavior', v_set.outside_behavior,
      'allow_test_sends', v_set.allow_test_sends
    ) END,
    'recipient_member_ids', COALESCE((
      SELECT json_agg(r.team_member_id) FROM public.product_landing_notification_recipients r
      WHERE r.landing_id = p_landing_id AND r.active AND r.kind = 'member'
    ), '[]'::json),
    'members', COALESCE((
      SELECT json_agg(json_build_object(
        'id', m.id, 'full_name', m.full_name, 'role_title', m.role_title,
        'status', m.status, 'email', m.notification_email,
        'eligible', (m.status = 'active' AND COALESCE(m.notification_email,'') ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$')
      ) ORDER BY m.full_name)
      FROM public.agency_team_members m WHERE m.agency_id = v_owner
    ), '[]'::json)
  );
END;
$$;
REVOKE ALL ON FUNCTION public.get_product_landing_notifications(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_product_landing_notifications(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.save_product_landing_notifications(p_landing_id uuid, p_config jsonb)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_owner_email text;
  v_enabled boolean := COALESCE((p_config->>'email_enabled')::boolean, false);
  v_include_owner boolean := COALESCE((p_config->>'include_owner')::boolean, true);
  v_assignee uuid := NULLIF(p_config->>'default_assignee_member_id','')::uuid;
  v_days text[];
  v_start time;
  v_end time;
  v_member_ids uuid[];
  v_valid uuid[];
  v_recipients int := 0;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','Não autorizado'); END IF;
  SELECT user_id INTO v_owner FROM public.agency_product_landings WHERE id = p_landing_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RETURN json_build_object('error','Não autorizado'); END IF;

  SELECT email INTO v_owner_email FROM auth.users WHERE id = v_owner;

  SELECT COALESCE(array_agg(x), ARRAY[]::text[]) INTO v_days
  FROM jsonb_array_elements_text(COALESCE(p_config->'notify_days','[]'::jsonb)) t(x)
  WHERE x IN ('sun','mon','tue','wed','thu','fri','sat');

  BEGIN
    v_start := COALESCE(NULLIF(p_config->>'notify_start',''), '08:00')::time;
    v_end   := COALESCE(NULLIF(p_config->>'notify_end',''), '18:00')::time;
  EXCEPTION WHEN others THEN
    RETURN json_build_object('error','Horário inválido.');
  END;
  IF v_start = v_end THEN RETURN json_build_object('error','O horário inicial e final não podem ser iguais.'); END IF;

  SELECT COALESCE(array_agg(x::uuid), ARRAY[]::uuid[]) INTO v_member_ids
  FROM jsonb_array_elements_text(COALESCE(p_config->'recipient_member_ids','[]'::jsonb)) t(x);

  -- Only active members of this very agency with a valid e-mail can stay
  SELECT COALESCE(array_agg(m.id), ARRAY[]::uuid[]) INTO v_valid
  FROM public.agency_team_members m
  WHERE m.agency_id = v_owner AND m.id = ANY(v_member_ids)
    AND m.status = 'active'
    AND COALESCE(m.notification_email,'') ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$';

  -- Responsible must belong to the same agency and be active
  IF v_assignee IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.agency_team_members m
    WHERE m.id = v_assignee AND m.agency_id = v_owner AND m.status = 'active'
  ) THEN
    RETURN json_build_object('error','O responsável selecionado não está ativo na sua equipe.');
  END IF;

  IF v_enabled AND NOT (v_include_owner AND COALESCE(v_owner_email,'') <> '') AND array_length(v_valid,1) IS NULL THEN
    RETURN json_build_object('error','Selecione ao menos um destinatário válido antes de ativar o e-mail.');
  END IF;
  IF v_enabled AND array_length(v_days,1) IS NULL THEN
    RETURN json_build_object('error','Selecione ao menos um dia da semana.');
  END IF;

  INSERT INTO public.product_landing_notification_settings AS s (
    landing_id, user_id, email_enabled, include_owner, default_assignee_member_id,
    notify_days, notify_start, notify_end, outside_behavior, allow_test_sends
  ) VALUES (
    p_landing_id, v_owner, v_enabled, v_include_owner, v_assignee,
    CASE WHEN array_length(v_days,1) IS NULL THEN ARRAY['mon','tue','wed','thu','fri']::text[] ELSE v_days END,
    v_start, v_end, 'next_window',
    COALESCE((p_config->>'allow_test_sends')::boolean, false)
  )
  ON CONFLICT (landing_id) DO UPDATE SET
    email_enabled = EXCLUDED.email_enabled,
    include_owner = EXCLUDED.include_owner,
    default_assignee_member_id = EXCLUDED.default_assignee_member_id,
    notify_days = EXCLUDED.notify_days,
    notify_start = EXCLUDED.notify_start,
    notify_end = EXCLUDED.notify_end,
    allow_test_sends = EXCLUDED.allow_test_sends,
    updated_at = now();

  DELETE FROM public.product_landing_notification_recipients WHERE landing_id = p_landing_id;

  IF v_include_owner AND COALESCE(v_owner_email,'') <> '' THEN
    INSERT INTO public.product_landing_notification_recipients (landing_id, user_id, kind, team_member_id, email)
    VALUES (p_landing_id, v_owner, 'owner', NULL, v_owner_email)
    ON CONFLICT DO NOTHING;
  END IF;

  INSERT INTO public.product_landing_notification_recipients (landing_id, user_id, kind, team_member_id, email)
  SELECT p_landing_id, v_owner, 'member', m.id, m.notification_email
  FROM public.agency_team_members m WHERE m.id = ANY(v_valid)
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_recipients FROM public.product_landing_notification_recipients WHERE landing_id = p_landing_id;
  RETURN json_build_object('success', true, 'recipients', v_recipients, 'dropped_members',
    COALESCE(array_length(v_member_ids,1),0) - COALESCE(array_length(v_valid,1),0));
END;
$$;
REVOKE ALL ON FUNCTION public.save_product_landing_notifications(uuid, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_product_landing_notifications(uuid, jsonb) TO authenticated;

-- 9. Queue claim / complete (backend only)
CREATE OR REPLACE FUNCTION public.claim_product_landing_lead_deliveries(p_limit integer DEFAULT 20)
RETURNS TABLE(
  delivery_id uuid, attempts integer, recipient_email text, recipient_kind text,
  lead_name text, lead_phone text, lead_email text, origin_city text, travel_period text,
  adults integer, children integer, children_ages text, interest_category text, message text,
  utm_source text, utm_medium text, utm_campaign text, created_at timestamptz, is_test boolean,
  lead_id uuid, product_key text, agency_name text, timezone text, assignee_name text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT d.id
    FROM public.product_landing_lead_deliveries d
    WHERE d.status IN ('pending','scheduled')
      AND d.scheduled_for <= now()
      AND d.attempts < 5
    ORDER BY d.scheduled_for
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit,20), 100))
    FOR UPDATE SKIP LOCKED
  ), upd AS (
    UPDATE public.product_landing_lead_deliveries d
    SET status = 'processing', claimed_at = now(), attempts = d.attempts + 1, updated_at = now()
    WHERE d.id IN (SELECT id FROM claimed)
    RETURNING d.*
  )
  SELECT u.id, u.attempts, u.recipient_email, u.recipient_kind,
         l.lead_name, l.lead_phone, l.lead_email, l.origin_city, l.travel_period,
         l.adults, l.children, l.children_ages, l.interest_category, l.message,
         l.utm_source, l.utm_medium, l.utm_campaign, l.created_at, l.is_test,
         l.id, l.product_key,
         COALESCE(NULLIF(pl.override_agency_name,''), NULLIF(pr.agency_name,''), pr.name, 'Sua agência'),
         pl.timezone,
         (SELECT m.full_name FROM public.agency_team_members m WHERE m.id = l.assigned_team_member_id)
  FROM upd u
  JOIN public.product_landing_leads l ON l.id = u.lead_id
  JOIN public.agency_product_landings pl ON pl.id = u.landing_id
  LEFT JOIN public.profiles pr ON pr.user_id = u.user_id
  WHERE
    -- Re-validate config right before sending
    EXISTS (
      SELECT 1 FROM public.product_landing_notification_settings s
      WHERE s.landing_id = u.landing_id AND s.email_enabled
        AND (NOT l.is_test OR s.allow_test_sends)
    )
    AND EXISTS (
      SELECT 1 FROM public.product_landing_notification_recipients r
      WHERE r.landing_id = u.landing_id AND r.active AND lower(r.email) = lower(u.recipient_email)
    )
    AND public.product_landing_next_notify_at(
      pl.timezone,
      (SELECT s.notify_days FROM public.product_landing_notification_settings s WHERE s.landing_id = u.landing_id),
      (SELECT s.notify_start FROM public.product_landing_notification_settings s WHERE s.landing_id = u.landing_id),
      (SELECT s.notify_end FROM public.product_landing_notification_settings s WHERE s.landing_id = u.landing_id),
      now()
    ) IS NULL;

  -- Anything claimed but no longer eligible is skipped, never left stuck
  UPDATE public.product_landing_lead_deliveries d
  SET status = 'skipped', error_message = 'Configuração inativa, destinatário removido ou fora da janela', updated_at = now()
  WHERE d.status = 'processing' AND d.claimed_at IS NOT NULL AND d.claimed_at >= now() - interval '5 seconds'
    AND NOT EXISTS (
      SELECT 1 FROM public.product_landing_notification_recipients r
      WHERE r.landing_id = d.landing_id AND r.active AND lower(r.email) = lower(d.recipient_email)
    );
END;
$$;
REVOKE ALL ON FUNCTION public.claim_product_landing_lead_deliveries(integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_product_landing_lead_deliveries(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_product_landing_lead_delivery(
  p_delivery_id uuid, p_status text, p_provider_message_id text DEFAULT NULL, p_error text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE v_attempts integer;
BEGIN
  SELECT attempts INTO v_attempts FROM public.product_landing_lead_deliveries WHERE id = p_delivery_id;
  IF v_attempts IS NULL THEN RETURN; END IF;

  IF p_status = 'sent' THEN
    UPDATE public.product_landing_lead_deliveries
    SET status = 'sent', sent_at = now(), provider_message_id = left(p_provider_message_id, 200),
        error_message = NULL, updated_at = now()
    WHERE id = p_delivery_id;
  ELSIF p_status = 'skipped' THEN
    UPDATE public.product_landing_lead_deliveries
    SET status = 'skipped', error_message = left(p_error, 300), updated_at = now()
    WHERE id = p_delivery_id;
  ELSE
    UPDATE public.product_landing_lead_deliveries
    SET status = CASE WHEN v_attempts >= 5 THEN 'failed' ELSE 'scheduled' END,
        scheduled_for = CASE WHEN v_attempts >= 5 THEN scheduled_for
                             ELSE now() + make_interval(mins => power(3, v_attempts)::int) END,
        error_message = left(p_error, 300), updated_at = now()
    WHERE id = p_delivery_id;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.complete_product_landing_lead_delivery(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_product_landing_lead_delivery(uuid, text, text, text) TO service_role;

-- 10. Lead submit: assign responsible (server-side only) + enqueue notifications
CREATE OR REPLACE FUNCTION public.submit_product_landing_lead(p_product_key text, p_slug text, p_payload jsonb, p_idempotency_key text DEFAULT NULL::text)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_landing RECORD;
  v_name text;
  v_phone text;
  v_email text;
  v_phone_digits text;
  v_existing RECORD;
  v_client_id uuid;
  v_opp_id uuid;
  v_lead_id uuid;
  v_destination text;
  v_is_test boolean := false;
  v_assignee uuid;
  v_assignee_cfg uuid;
  v_reason text;
BEGIN
  IF p_product_key IS NULL OR p_slug IS NULL OR p_payload IS NULL THEN
    RETURN json_build_object('error', 'Dados inválidos');
  END IF;

  SELECT * INTO v_landing
  FROM public.agency_product_landings
  WHERE product_key = p_product_key AND slug = lower(p_slug) AND status = 'active';

  IF v_landing IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  v_is_test := COALESCE(v_landing.test_mode_until > now(), false);

  v_name  := trim(COALESCE(p_payload->>'lead_name', ''));
  v_phone := trim(COALESCE(p_payload->>'lead_phone', ''));
  v_email := NULLIF(trim(COALESCE(p_payload->>'lead_email', '')), '');
  v_phone_digits := regexp_replace(v_phone, '[^0-9]', '', 'g');

  IF length(v_name) < 2 OR length(v_name) > 120 THEN
    RETURN json_build_object('error', 'Informe um nome válido.');
  END IF;
  IF length(v_phone_digits) < 10 OR length(v_phone_digits) > 15 THEN
    RETURN json_build_object('error', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF COALESCE((p_payload->>'consent_accepted')::boolean, false) IS NOT TRUE THEN
    RETURN json_build_object('error', 'É necessário aceitar a política de privacidade.');
  END IF;

  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.product_landing_leads
    WHERE landing_id = v_landing.id AND idempotency_key = p_idempotency_key;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  SELECT * INTO v_existing FROM public.product_landing_leads
  WHERE landing_id = v_landing.id
    AND public._normalize_phone(lead_phone) = public._normalize_phone(v_phone)
    AND created_at > now() - interval '30 minutes'
  ORDER BY created_at DESC LIMIT 1;

  IF v_existing.id IS NOT NULL THEN
    RETURN json_build_object('success', true, 'duplicate', true);
  END IF;

  v_destination := COALESCE(NULLIF(trim(COALESCE(p_payload->>'destination','')), ''), 'Transamerica Comandatuba');

  SELECT client_id, opportunity_id INTO v_client_id, v_opp_id
  FROM public.ensure_client_and_opportunity_for_lead(
    v_landing.user_id, v_name, v_phone, v_email, v_destination
  );

  -- Responsible comes only from the agency's own configuration, never from the public payload
  SELECT default_assignee_member_id INTO v_assignee_cfg
  FROM public.product_landing_notification_settings WHERE landing_id = v_landing.id;

  IF v_assignee_cfg IS NOT NULL THEN
    SELECT m.id INTO v_assignee FROM public.agency_team_members m
    WHERE m.id = v_assignee_cfg AND m.agency_id = v_landing.user_id AND m.status = 'active';
    IF v_assignee IS NULL THEN
      v_reason := 'responsavel_indisponivel_fallback_titular';
    ELSE
      v_reason := 'responsavel_padrao_da_landing';
    END IF;
  ELSE
    v_reason := 'sem_responsavel_configurado_fallback_titular';
  END IF;

  INSERT INTO public.product_landing_leads (
    landing_id, user_id, product_key, client_id, opportunity_id,
    lead_name, lead_phone, lead_email, origin_city, travel_period,
    adults, children, children_ages, interest_category, message,
    consent_accepted, consent_at,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer, page_url, user_agent, idempotency_key, is_test,
    assigned_team_member_id, assignment_reason
  ) VALUES (
    v_landing.id, v_landing.user_id, v_landing.product_key, v_client_id, v_opp_id,
    v_name, v_phone, v_email,
    left(NULLIF(trim(COALESCE(p_payload->>'origin_city','')), ''), 120),
    left(NULLIF(trim(COALESCE(p_payload->>'travel_period','')), ''), 120),
    NULLIF(p_payload->>'adults','')::int,
    NULLIF(p_payload->>'children','')::int,
    left(NULLIF(trim(COALESCE(p_payload->>'children_ages','')), ''), 120),
    left(NULLIF(trim(COALESCE(p_payload->>'interest_category','')), ''), 160),
    left(NULLIF(trim(COALESCE(p_payload->>'message','')), ''), 2000),
    true, now(),
    left(NULLIF(p_payload->>'utm_source',''), 160),
    left(NULLIF(p_payload->>'utm_medium',''), 160),
    left(NULLIF(p_payload->>'utm_campaign',''), 160),
    left(NULLIF(p_payload->>'utm_content',''), 160),
    left(NULLIF(p_payload->>'utm_term',''), 160),
    left(NULLIF(p_payload->>'referrer',''), 500),
    left(NULLIF(p_payload->>'page_url',''), 500),
    left(NULLIF(p_payload->>'user_agent',''), 300),
    left(NULLIF(p_idempotency_key,''), 120),
    v_is_test, v_assignee, v_reason
  )
  RETURNING id INTO v_lead_id;

  IF v_assignee IS NOT NULL AND v_opp_id IS NOT NULL THEN
    UPDATE public.opportunities SET assigned_team_member_id = v_assignee WHERE id = v_opp_id;
  END IF;

  IF NOT v_is_test THEN
    UPDATE public.agency_product_landings
    SET leads_count = leads_count + 1
    WHERE id = v_landing.id;
  END IF;

  -- E-mail queueing must never break the lead / CRM creation
  BEGIN
    PERFORM public.enqueue_product_landing_lead_notifications(v_lead_id);
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN json_build_object('success', true, 'lead_id', v_lead_id, 'is_test', v_is_test);
END;
$$;