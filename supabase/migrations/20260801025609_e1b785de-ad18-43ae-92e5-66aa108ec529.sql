-- ============================================================
-- 1. CONFIGURAÇÃO DO FORMULÁRIO CONVERSACIONAL
-- ============================================================
ALTER TABLE public.lead_capture_forms
  ADD COLUMN IF NOT EXISTS headline text,
  ADD COLUMN IF NOT EXISTS closing_message text,
  ADD COLUMN IF NOT EXISTS brand_color text,
  ADD COLUMN IF NOT EXISTS agency_name_override text,
  ADD COLUMN IF NOT EXISTS logo_url_override text,
  ADD COLUMN IF NOT EXISTS consultant_name_override text,
  ADD COLUMN IF NOT EXISTS consultant_role_override text,
  ADD COLUMN IF NOT EXISTS consultant_photo_url_override text,
  ADD COLUMN IF NOT EXISTS whatsapp_override text,
  ADD COLUMN IF NOT EXISTS timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  ADD COLUMN IF NOT EXISTS office_hours jsonb NOT NULL DEFAULT '{"mon": [["08:00","18:00"]], "tue": [["08:00","18:00"]], "wed": [["08:00","18:00"]], "thu": [["08:00","18:00"]], "fri": [["08:00","18:00"]], "sat": [], "sun": []}'::jsonb,
  ADD COLUMN IF NOT EXISTS hours_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ask_email boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS require_email boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS ask_dates boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ask_travelers boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ask_budget boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS ai_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS privacy_url text,
  ADD COLUMN IF NOT EXISTS terms_url text,
  ADD COLUMN IF NOT EXISTS test_mode_until timestamptz,
  ADD COLUMN IF NOT EXISTS views_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS leads_count integer NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS lead_capture_forms_token_key ON public.lead_capture_forms (token);

-- ============================================================
-- 2. LEADS
-- ============================================================
ALTER TABLE public.lead_captures
  ADD COLUMN IF NOT EXISTS lead_email text,
  ADD COLUMN IF NOT EXISTS lead_summary text,
  ADD COLUMN IF NOT EXISTS session_id text,
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS consent_at timestamptz,
  ADD COLUMN IF NOT EXISTS consent_version text,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS utm jsonb,
  ADD COLUMN IF NOT EXISTS is_test boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS within_office_hours boolean,
  ADD COLUMN IF NOT EXISTS client_id uuid,
  ADD COLUMN IF NOT EXISTS opportunity_id uuid;

CREATE UNIQUE INDEX IF NOT EXISTS lead_captures_idempotency_key ON public.lead_captures (idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS lead_captures_agent_created ON public.lead_captures (agent_user_id, created_at DESC);

-- Escrita pública direta deixa de existir (agora via função no servidor)
DROP POLICY IF EXISTS "Anon can insert leads" ON public.lead_captures;
DROP POLICY IF EXISTS "Public read active forms" ON public.lead_capture_forms;
REVOKE ALL ON public.lead_captures FROM anon;
REVOKE ALL ON public.lead_capture_forms FROM anon;

-- A criação de cliente/oportunidade passa a ser feita na função de submissão
DROP TRIGGER IF EXISTS trg_lead_capture_to_opp ON public.lead_captures;

-- ============================================================
-- 3. NOVAS TABELAS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.lead_form_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  session_hash text NOT NULL,
  viewed_date date NOT NULL DEFAULT CURRENT_DATE,
  is_test boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lead_form_views_unique UNIQUE (form_id, session_hash, viewed_date)
);
GRANT SELECT ON public.lead_form_views TO authenticated;
GRANT ALL ON public.lead_form_views TO service_role;
ALTER TABLE public.lead_form_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency reads own form views" ON public.lead_form_views
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id = public.current_agency_id());

CREATE TABLE IF NOT EXISTS public.lead_form_notification_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL UNIQUE REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  email_enabled boolean NOT NULL DEFAULT false,
  include_owner boolean NOT NULL DEFAULT true,
  notify_days text[] NOT NULL DEFAULT ARRAY['mon','tue','wed','thu','fri'],
  notify_start time NOT NULL DEFAULT '08:00',
  notify_end time NOT NULL DEFAULT '18:00',
  outside_behavior text NOT NULL DEFAULT 'next_window',
  allow_test_sends boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_form_notification_settings TO authenticated;
GRANT ALL ON public.lead_form_notification_settings TO service_role;
ALTER TABLE public.lead_form_notification_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency manages own form notification settings" ON public.lead_form_notification_settings
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER trg_lf_notif_settings_updated BEFORE UPDATE ON public.lead_form_notification_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.lead_form_notification_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  form_id uuid NOT NULL REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'member',
  team_member_id uuid REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  email text NOT NULL,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS lead_form_recipients_unique ON public.lead_form_notification_recipients (form_id, lower(email));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.lead_form_notification_recipients TO authenticated;
GRANT ALL ON public.lead_form_notification_recipients TO service_role;
ALTER TABLE public.lead_form_notification_recipients ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency manages own form recipients" ON public.lead_form_notification_recipients
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.lead_form_lead_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id uuid NOT NULL REFERENCES public.lead_captures(id) ON DELETE CASCADE,
  form_id uuid NOT NULL REFERENCES public.lead_capture_forms(id) ON DELETE CASCADE,
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
CREATE UNIQUE INDEX IF NOT EXISTS lead_form_delivery_unique ON public.lead_form_lead_deliveries (lead_id, lower(recipient_email));
CREATE INDEX IF NOT EXISTS lead_form_delivery_due ON public.lead_form_lead_deliveries (status, scheduled_for);
GRANT SELECT ON public.lead_form_lead_deliveries TO authenticated;
GRANT ALL ON public.lead_form_lead_deliveries TO service_role;
ALTER TABLE public.lead_form_lead_deliveries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Agency reads own form lead deliveries" ON public.lead_form_lead_deliveries
  FOR SELECT TO authenticated USING (user_id = auth.uid() OR user_id = public.current_agency_id());
CREATE TRIGGER trg_lf_deliveries_updated BEFORE UPDATE ON public.lead_form_lead_deliveries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 4. LEITURA PÚBLICA CONTROLADA
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_public_lead_form(p_token text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_form RECORD;
  v_profile RECORD;
  v_is_test boolean := false;
BEGIN
  IF p_token IS NULL OR length(p_token) < 6 OR length(p_token) > 80 THEN
    RETURN json_build_object('error', 'Formulário não encontrado');
  END IF;

  SELECT * INTO v_form FROM public.lead_capture_forms WHERE token = p_token;
  IF v_form.id IS NULL THEN
    RETURN json_build_object('error', 'Formulário não encontrado');
  END IF;

  IF COALESCE(v_form.is_active, true) IS NOT TRUE THEN
    IF v_form.test_mode_until IS NOT NULL AND v_form.test_mode_until > now() THEN
      v_is_test := true;
    ELSE
      RETURN json_build_object('error', 'Formulário indisponível');
    END IF;
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_form.user_id;

  RETURN json_build_object(
    'form_id', v_form.id,
    'token', v_form.token,
    'is_test', v_is_test,
    'headline', NULLIF(btrim(COALESCE(v_form.headline, '')), ''),
    'welcome_message', v_form.welcome_message,
    'closing_message', NULLIF(btrim(COALESCE(v_form.closing_message, '')), ''),
    'brand_color', NULLIF(btrim(COALESCE(v_form.brand_color, '')), ''),
    'agency_name', COALESCE(NULLIF(v_form.agency_name_override, ''), NULLIF(v_profile.agency_name, ''), v_profile.name),
    'logo_url', COALESCE(NULLIF(v_form.logo_url_override, ''), v_profile.agency_logo_url),
    'consultant_name', COALESCE(NULLIF(v_form.consultant_name_override, ''), v_profile.name),
    'consultant_role', COALESCE(NULLIF(v_form.consultant_role_override, ''), 'Consultor(a) de viagens'),
    'consultant_photo_url', COALESCE(NULLIF(v_form.consultant_photo_url_override, ''), v_profile.avatar_url),
    'whatsapp', regexp_replace(COALESCE(NULLIF(v_form.whatsapp_override, ''), v_profile.phone, ''), '[^0-9]', '', 'g'),
    'city', v_profile.city,
    'timezone', v_form.timezone,
    'office_hours', v_form.office_hours,
    'server_now', now(),
    'ask_email', v_form.ask_email,
    'require_email', v_form.require_email,
    'ask_dates', v_form.ask_dates,
    'ask_travelers', v_form.ask_travelers,
    'ask_budget', v_form.ask_budget,
    'ai_enabled', v_form.ai_enabled,
    'privacy_url', NULLIF(btrim(COALESCE(v_form.privacy_url, '')), ''),
    'terms_url', NULLIF(btrim(COALESCE(v_form.terms_url, '')), '')
  );
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_lead_form(text) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.track_lead_form_view(p_token text, p_session_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_form RECORD;
  v_is_test boolean := false;
BEGIN
  IF p_token IS NULL OR p_session_hash IS NULL OR length(p_session_hash) < 8 OR length(p_session_hash) > 128 THEN
    RETURN;
  END IF;

  SELECT * INTO v_form FROM public.lead_capture_forms WHERE token = p_token;
  IF v_form.id IS NULL THEN RETURN; END IF;
  IF COALESCE(v_form.is_active, true) IS NOT TRUE THEN
    IF v_form.test_mode_until IS NOT NULL AND v_form.test_mode_until > now() THEN
      v_is_test := true;
    ELSE
      RETURN;
    END IF;
  END IF;

  INSERT INTO public.lead_form_views (form_id, user_id, session_hash, is_test)
  VALUES (v_form.id, v_form.user_id, p_session_hash, v_is_test)
  ON CONFLICT DO NOTHING;

  IF NOT v_is_test THEN
    UPDATE public.lead_capture_forms SET views_count = views_count + 1 WHERE id = v_form.id;
  END IF;
END;
$$;
GRANT EXECUTE ON FUNCTION public.track_lead_form_view(text, text) TO anon, authenticated, service_role;

-- ============================================================
-- 5. FILA DE NOTIFICAÇÕES
-- ============================================================
CREATE OR REPLACE FUNCTION public.enqueue_lead_form_notifications(p_lead_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lead RECORD;
  v_set RECORD;
  v_tz text;
  v_when timestamptz;
  v_count integer := 0;
BEGIN
  SELECT * INTO v_lead FROM public.lead_captures WHERE id = p_lead_id;
  IF v_lead.id IS NULL THEN RETURN 0; END IF;

  SELECT * INTO v_set FROM public.lead_form_notification_settings WHERE form_id = v_lead.form_id;
  IF v_set.id IS NULL OR NOT v_set.email_enabled THEN RETURN 0; END IF;
  IF v_lead.is_test AND NOT v_set.allow_test_sends THEN RETURN 0; END IF;

  SELECT timezone INTO v_tz FROM public.lead_capture_forms WHERE id = v_lead.form_id;

  v_when := public.product_landing_next_notify_at(
    v_tz, v_set.notify_days, v_set.notify_start, v_set.notify_end, now()
  );

  INSERT INTO public.lead_form_lead_deliveries (
    lead_id, form_id, user_id, recipient_kind, recipient_member_id, recipient_email, status, scheduled_for
  )
  SELECT p_lead_id, v_lead.form_id, v_lead.agent_user_id, r.kind, r.team_member_id, r.email,
         CASE WHEN v_when IS NULL THEN 'pending' ELSE 'scheduled' END,
         COALESCE(v_when, now())
  FROM public.lead_form_notification_recipients r
  WHERE r.form_id = v_lead.form_id
    AND r.active
    AND r.email ~ '^[^\s@]+@[^\s@]+\.[^\s@]+$'
  ON CONFLICT DO NOTHING;

  SELECT count(*) INTO v_count FROM public.lead_form_lead_deliveries WHERE lead_id = p_lead_id;
  RETURN v_count;
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_lead_form_deliveries(p_limit integer DEFAULT 20)
RETURNS TABLE(
  delivery_id uuid, attempts integer, recipient_email text, recipient_kind text,
  lead_name text, lead_phone text, lead_email text, destination text, travel_dates text,
  travelers_count text, budget text, additional_info text, lead_summary text,
  created_at timestamptz, is_test boolean, lead_id uuid, agency_name text, timezone text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    SELECT d.id FROM public.lead_form_lead_deliveries d
    WHERE d.status IN ('pending','scheduled') AND d.scheduled_for <= now() AND d.attempts < 5
    ORDER BY d.scheduled_for
    LIMIT GREATEST(1, LEAST(COALESCE(p_limit,20), 100))
    FOR UPDATE SKIP LOCKED
  ), upd AS (
    UPDATE public.lead_form_lead_deliveries d
    SET status = 'processing', claimed_at = now(), attempts = d.attempts + 1, updated_at = now()
    WHERE d.id IN (SELECT id FROM claimed)
    RETURNING d.*
  )
  SELECT u.id, u.attempts, u.recipient_email, u.recipient_kind,
         l.lead_name, l.lead_phone, l.lead_email, l.destination, l.travel_dates,
         l.travelers_count, l.budget, l.additional_info, l.lead_summary,
         l.created_at, l.is_test, l.id,
         COALESCE(NULLIF(f.agency_name_override,''), NULLIF(pr.agency_name,''), pr.name, 'Sua agência'),
         f.timezone
  FROM upd u
  JOIN public.lead_captures l ON l.id = u.lead_id
  JOIN public.lead_capture_forms f ON f.id = u.form_id
  LEFT JOIN public.profiles pr ON pr.user_id = u.user_id
  WHERE EXISTS (
      SELECT 1 FROM public.lead_form_notification_settings s
      WHERE s.form_id = u.form_id AND s.email_enabled
        AND (NOT l.is_test OR s.allow_test_sends)
    )
    AND EXISTS (
      SELECT 1 FROM public.lead_form_notification_recipients r
      WHERE r.form_id = u.form_id AND r.active AND lower(r.email) = lower(u.recipient_email)
    );

  UPDATE public.lead_form_lead_deliveries d
  SET status = 'skipped', error_message = 'Configuração inativa ou destinatário removido', updated_at = now()
  WHERE d.status = 'processing' AND d.claimed_at IS NOT NULL AND d.claimed_at >= now() - interval '5 seconds'
    AND NOT EXISTS (
      SELECT 1 FROM public.lead_form_notification_recipients r
      WHERE r.form_id = d.form_id AND r.active AND lower(r.email) = lower(d.recipient_email)
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.complete_lead_form_delivery(p_delivery_id uuid, p_status text, p_provider_message_id text DEFAULT NULL, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_attempts integer;
BEGIN
  SELECT attempts INTO v_attempts FROM public.lead_form_lead_deliveries WHERE id = p_delivery_id;
  IF v_attempts IS NULL THEN RETURN; END IF;

  IF p_status = 'sent' THEN
    UPDATE public.lead_form_lead_deliveries
    SET status = 'sent', sent_at = now(), provider_message_id = left(p_provider_message_id, 200),
        error_message = NULL, updated_at = now()
    WHERE id = p_delivery_id;
  ELSIF p_status = 'skipped' THEN
    UPDATE public.lead_form_lead_deliveries
    SET status = 'skipped', error_message = left(p_error, 300), updated_at = now()
    WHERE id = p_delivery_id;
  ELSE
    UPDATE public.lead_form_lead_deliveries
    SET status = CASE WHEN v_attempts >= 5 THEN 'failed' ELSE 'scheduled' END,
        scheduled_for = CASE WHEN v_attempts >= 5 THEN scheduled_for
                             ELSE now() + make_interval(mins => power(3, v_attempts)::int) END,
        error_message = left(p_error, 300), updated_at = now()
    WHERE id = p_delivery_id;
  END IF;
END;
$$;

-- ============================================================
-- 6. SUBMISSÃO SEGURA (somente servidor)
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_conversational_lead(p_token text, p_payload jsonb)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_form RECORD;
  v_is_test boolean := false;
  v_name text;
  v_phone text;
  v_email text;
  v_key text;
  v_existing RECORD;
  v_lead_id uuid;
  v_within boolean;
  v_client uuid;
  v_opp uuid;
BEGIN
  IF p_token IS NULL THEN RETURN json_build_object('error', 'Formulário não encontrado'); END IF;

  SELECT * INTO v_form FROM public.lead_capture_forms WHERE token = p_token;
  IF v_form.id IS NULL THEN RETURN json_build_object('error', 'Formulário não encontrado'); END IF;

  IF COALESCE(v_form.is_active, true) IS NOT TRUE THEN
    IF v_form.test_mode_until IS NOT NULL AND v_form.test_mode_until > now() THEN
      v_is_test := true;
    ELSE
      RETURN json_build_object('error', 'Formulário indisponível');
    END IF;
  END IF;

  v_name := NULLIF(btrim(COALESCE(p_payload->>'lead_name', '')), '');
  v_phone := regexp_replace(COALESCE(p_payload->>'lead_phone', ''), '[^0-9]', '', 'g');
  v_email := lower(NULLIF(btrim(COALESCE(p_payload->>'lead_email', '')), ''));

  IF v_name IS NULL OR length(v_name) < 2 THEN
    RETURN json_build_object('error', 'Informe seu nome completo.');
  END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 15 THEN
    RETURN json_build_object('error', 'Informe um WhatsApp válido com DDD.');
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF v_form.require_email AND v_email IS NULL THEN
    RETURN json_build_object('error', 'Informe um e-mail válido.');
  END IF;
  IF (p_payload->>'consent') IS DISTINCT FROM 'true' THEN
    RETURN json_build_object('error', 'É necessário aceitar o uso dos seus dados para contato.');
  END IF;

  v_key := NULLIF(btrim(COALESCE(p_payload->>'idempotency_key', '')), '');

  IF v_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.lead_captures WHERE idempotency_key = v_key;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('lead_id', v_existing.id, 'duplicate', true, 'is_test', v_existing.is_test);
    END IF;
  END IF;

  -- Anti-flood: mesmo telefone no mesmo formulário nos últimos 10 minutos
  SELECT * INTO v_existing
  FROM public.lead_captures
  WHERE form_id = v_form.id
    AND public._normalize_phone(lead_phone) = public._normalize_phone(v_phone)
    AND created_at > now() - interval '10 minutes'
  ORDER BY created_at DESC LIMIT 1;
  IF v_existing.id IS NOT NULL THEN
    RETURN json_build_object('lead_id', v_existing.id, 'duplicate', true, 'is_test', v_existing.is_test);
  END IF;

  v_within := public.product_landing_next_notify_at(
    v_form.timezone,
    ARRAY(SELECT jsonb_object_keys(v_form.office_hours)),
    '00:00'::time, '00:00'::time, now()
  ) IS NULL;

  INSERT INTO public.lead_captures (
    form_id, agent_user_id, lead_name, lead_phone, lead_email,
    destination, travel_dates, travelers_count, budget, additional_info,
    lead_summary, ai_suggestion, whatsapp_message,
    session_id, idempotency_key, consent_at, consent_version, source_url, utm,
    is_test, within_office_hours
  ) VALUES (
    v_form.id, v_form.user_id, left(v_name, 200), v_phone, left(v_email, 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'destination','')), ''), 300),
    left(NULLIF(btrim(COALESCE(p_payload->>'travel_dates','')), ''), 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'travelers_count','')), ''), 100),
    left(NULLIF(btrim(COALESCE(p_payload->>'budget','')), ''), 200),
    left(NULLIF(btrim(COALESCE(p_payload->>'additional_info','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'lead_summary','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'ai_suggestion','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'whatsapp_message','')), ''), 2000),
    left(NULLIF(btrim(COALESCE(p_payload->>'session_id','')), ''), 100),
    v_key, now(),
    left(COALESCE(p_payload->>'consent_version', 'v1'), 20),
    left(NULLIF(btrim(COALESCE(p_payload->>'source_url','')), ''), 500),
    CASE WHEN p_payload ? 'utm' THEN p_payload->'utm' ELSE NULL END,
    v_is_test, COALESCE((p_payload->>'within_office_hours')::boolean, v_within)
  )
  RETURNING id INTO v_lead_id;

  IF NOT v_is_test THEN
    BEGIN
      SELECT client_id, opportunity_id INTO v_client, v_opp
      FROM public.ensure_client_and_opportunity_for_lead(
        v_form.user_id, v_name, v_phone, v_email, p_payload->>'destination'
      );
      UPDATE public.lead_captures SET client_id = v_client, opportunity_id = v_opp WHERE id = v_lead_id;
    EXCEPTION WHEN others THEN
      RAISE WARNING 'CRM sync failed for lead %: %', v_lead_id, SQLERRM;
    END;

    UPDATE public.lead_capture_forms SET leads_count = leads_count + 1 WHERE id = v_form.id;
  END IF;

  BEGIN
    PERFORM public.enqueue_lead_form_notifications(v_lead_id);
  EXCEPTION WHEN others THEN
    RAISE WARNING 'Notification enqueue failed for lead %: %', v_lead_id, SQLERRM;
  END;

  RETURN json_build_object(
    'lead_id', v_lead_id,
    'duplicate', false,
    'is_test', v_is_test,
    'agent_whatsapp', regexp_replace(COALESCE(NULLIF(v_form.whatsapp_override, ''), ''), '[^0-9]', '', 'g')
  );
END;
$$;
REVOKE ALL ON FUNCTION public.submit_conversational_lead(text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_conversational_lead(text, jsonb) TO service_role;

-- ============================================================
-- 7. CONFIGURAÇÃO DE NOTIFICAÇÕES (painel da agência)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_lead_form_notifications(p_form_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_owner uuid;
  v_tz text;
  v_set RECORD;
  v_owner_email text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN json_build_object('error','Não autorizado'); END IF;
  SELECT user_id, timezone INTO v_owner, v_tz FROM public.lead_capture_forms WHERE id = p_form_id;
  IF v_owner IS NULL OR v_owner <> auth.uid() THEN RETURN json_build_object('error','Não autorizado'); END IF;

  SELECT email INTO v_owner_email FROM auth.users WHERE id = v_owner;
  SELECT * INTO v_set FROM public.lead_form_notification_settings WHERE form_id = p_form_id;

  RETURN json_build_object(
    'form_id', p_form_id,
    'timezone', v_tz,
    'owner_email', v_owner_email,
    'settings', CASE WHEN v_set.id IS NULL THEN NULL ELSE json_build_object(
      'email_enabled', v_set.email_enabled,
      'include_owner', v_set.include_owner,
      'notify_days', v_set.notify_days,
      'notify_start', to_char(v_set.notify_start,'HH24:MI'),
      'notify_end', to_char(v_set.notify_end,'HH24:MI'),
      'outside_behavior', v_set.outside_behavior,
      'allow_test_sends', v_set.allow_test_sends
    ) END,
    'recipient_member_ids', COALESCE((
      SELECT json_agg(r.team_member_id) FROM public.lead_form_notification_recipients r
      WHERE r.form_id = p_form_id AND r.active AND r.kind = 'member'
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
GRANT EXECUTE ON FUNCTION public.get_lead_form_notifications(uuid) TO authenticated, service_role;