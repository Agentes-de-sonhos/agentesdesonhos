-- 1) Slug público da agência
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS public_slug text;

CREATE OR REPLACE FUNCTION public.normalize_public_slug(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT left(
    trim(both '-' from regexp_replace(
      regexp_replace(lower(public.immutable_unaccent(COALESCE(_input, ''))), '[^a-z0-9]+', '-', 'g'),
      '-+', '-', 'g'
    )),
    40
  );
$$;

CREATE OR REPLACE FUNCTION public.is_reserved_slug(_slug text)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(_slug, '') = ANY (ARRAY[
    'admin','api','app','assets','auth','blog','c','cadastro','cadastro-fornecedor',
    'cadastro-guia','captura-cartao','certificate-test','criar-cartao','dashboard',
    'demo','desconto30off','experiencias','fatura','formulario','lp','orcamento',
    'pesquisa','planos','politicasdeprivacidade','reset-password','roteiro',
    'static','support','termosdeuso','v','viagem','vitrine','www','ativar-cartao'
  ]);
$$;

-- Backfill com resolução de colisões
WITH base AS (
  SELECT
    user_id,
    NULLIF(public.normalize_public_slug(COALESCE(NULLIF(agency_name, ''), name)), '') AS s,
    created_at
  FROM public.profiles
  WHERE public_slug IS NULL
),
ranked AS (
  SELECT
    user_id,
    s,
    row_number() OVER (PARTITION BY s ORDER BY created_at, user_id) AS rn
  FROM base
  WHERE s IS NOT NULL
)
UPDATE public.profiles p
SET public_slug = CASE
      WHEN r.rn = 1 AND NOT public.is_reserved_slug(r.s) THEN r.s
      ELSE left(r.s, 32) || '-' || substr(replace(p.user_id::text, '-', ''), 1, 6)
    END
FROM ranked r
WHERE p.user_id = r.user_id;

CREATE UNIQUE INDEX IF NOT EXISTS profiles_public_slug_key
  ON public.profiles (public_slug) WHERE public_slug IS NOT NULL;

-- 2) Instâncias de landing page por agência
CREATE TABLE IF NOT EXISTS public.agency_product_landings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  product_key text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  slug text NOT NULL,
  override_agency_name text,
  override_whatsapp text,
  override_phone text,
  override_email text,
  override_logo_url text,
  override_consultant_name text,
  override_consultant_role text,
  override_consultant_photo_url text,
  override_city text,
  whatsapp_message_template text,
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  office_hours jsonb NOT NULL DEFAULT '{"mon":[["08:00","18:00"]],"tue":[["08:00","18:00"]],"wed":[["08:00","18:00"]],"thu":[["08:00","18:00"]],"fri":[["08:00","18:00"]],"sat":[],"sun":[]}'::jsonb,
  views_count integer NOT NULL DEFAULT 0,
  leads_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agency_product_landings_status_chk CHECK (status IN ('draft','active','disabled')),
  CONSTRAINT agency_product_landings_user_product_key UNIQUE (user_id, product_key),
  CONSTRAINT agency_product_landings_product_slug_key UNIQUE (product_key, slug)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_product_landings TO authenticated;
GRANT ALL ON public.agency_product_landings TO service_role;
ALTER TABLE public.agency_product_landings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage their product landings"
ON public.agency_product_landings FOR ALL TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_agency_product_landings_updated_at
BEFORE UPDATE ON public.agency_product_landings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Leads
CREATE TABLE IF NOT EXISTS public.product_landing_leads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_id uuid NOT NULL REFERENCES public.agency_product_landings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  product_key text NOT NULL,
  client_id uuid,
  opportunity_id uuid,
  lead_name text NOT NULL,
  lead_phone text NOT NULL,
  lead_email text,
  origin_city text,
  travel_period text,
  adults integer,
  children integer,
  children_ages text,
  interest_category text,
  message text,
  consent_accepted boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  referrer text,
  page_url text,
  user_agent text,
  idempotency_key text,
  is_read boolean NOT NULL DEFAULT false,
  attended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS product_landing_leads_idem_key
  ON public.product_landing_leads (landing_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS product_landing_leads_user_idx
  ON public.product_landing_leads (user_id, created_at DESC);

GRANT SELECT, UPDATE, DELETE ON public.product_landing_leads TO authenticated;
GRANT ALL ON public.product_landing_leads TO service_role;
ALTER TABLE public.product_landing_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their landing leads"
ON public.product_landing_leads FOR SELECT TO authenticated
USING (user_id = auth.uid());
CREATE POLICY "Owners update their landing leads"
ON public.product_landing_leads FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Owners delete their landing leads"
ON public.product_landing_leads FOR DELETE TO authenticated
USING (user_id = auth.uid());

-- 4) Views
CREATE TABLE IF NOT EXISTS public.product_landing_views (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  landing_id uuid NOT NULL REFERENCES public.agency_product_landings(id) ON DELETE CASCADE,
  session_hash text NOT NULL,
  viewed_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT product_landing_views_unique UNIQUE (landing_id, session_hash, viewed_date)
);

GRANT SELECT ON public.product_landing_views TO authenticated;
GRANT ALL ON public.product_landing_views TO service_role;
ALTER TABLE public.product_landing_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners read their landing views"
ON public.product_landing_views FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.agency_product_landings l
  WHERE l.id = product_landing_views.landing_id AND l.user_id = auth.uid()
));

-- 5) Leitura pública
CREATE OR REPLACE FUNCTION public.get_public_product_landing(p_product_key text, p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_landing RECORD;
  v_profile RECORD;
BEGIN
  IF p_slug IS NULL OR length(p_slug) < 2 OR length(p_slug) > 60
     OR p_product_key IS NULL OR length(p_product_key) > 80 THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  SELECT * INTO v_landing
  FROM public.agency_product_landings
  WHERE product_key = p_product_key
    AND slug = lower(p_slug)
    AND status = 'active';

  IF v_landing IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE user_id = v_landing.user_id;
  IF v_profile IS NULL THEN
    RETURN json_build_object('error', 'Página não encontrada');
  END IF;

  RETURN json_build_object(
    'landing_id', v_landing.id,
    'product_key', v_landing.product_key,
    'slug', v_landing.slug,
    'agency_name', COALESCE(NULLIF(v_landing.override_agency_name, ''), NULLIF(v_profile.agency_name, ''), v_profile.name),
    'logo_url', COALESCE(NULLIF(v_landing.override_logo_url, ''), v_profile.agency_logo_url),
    'whatsapp', regexp_replace(COALESCE(NULLIF(v_landing.override_whatsapp, ''), v_profile.phone, ''), '[^0-9]', '', 'g'),
    'phone', COALESCE(NULLIF(v_landing.override_phone, ''), v_profile.phone),
    'email', NULLIF(v_landing.override_email, ''),
    'city', COALESCE(NULLIF(v_landing.override_city, ''), v_profile.city),
    'consultant_name', COALESCE(NULLIF(v_landing.override_consultant_name, ''), v_profile.name),
    'consultant_role', COALESCE(NULLIF(v_landing.override_consultant_role, ''), 'Consultor(a) de viagens'),
    'consultant_photo_url', COALESCE(NULLIF(v_landing.override_consultant_photo_url, ''), v_profile.avatar_url),
    'whatsapp_message_template', v_landing.whatsapp_message_template,
    'timezone', v_landing.timezone,
    'office_hours', v_landing.office_hours,
    'server_now', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_product_landing(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_product_landing(text, text) TO anon, authenticated, service_role;

-- 6) Registro de visita
CREATE OR REPLACE FUNCTION public.track_product_landing_view(p_landing_id uuid, p_session_hash text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean := false;
BEGIN
  IF p_landing_id IS NULL OR p_session_hash IS NULL OR length(p_session_hash) > 128 THEN
    RETURN;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.agency_product_landings
    WHERE id = p_landing_id AND status = 'active'
  ) THEN
    RETURN;
  END IF;

  INSERT INTO public.product_landing_views (landing_id, session_hash, viewed_date)
  VALUES (p_landing_id, p_session_hash, CURRENT_DATE)
  ON CONFLICT (landing_id, session_hash, viewed_date) DO NOTHING;

  GET DIAGNOSTICS v_ok = ROW_COUNT;
  IF v_ok THEN
    UPDATE public.agency_product_landings
    SET views_count = views_count + 1
    WHERE id = p_landing_id;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.track_product_landing_view(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_product_landing_view(uuid, text) TO anon, authenticated, service_role;

-- 7) Envio de lead
CREATE OR REPLACE FUNCTION public.submit_product_landing_lead(
  p_product_key text,
  p_slug text,
  p_payload jsonb,
  p_idempotency_key text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- Idempotência
  IF p_idempotency_key IS NOT NULL THEN
    SELECT * INTO v_existing FROM public.product_landing_leads
    WHERE landing_id = v_landing.id AND idempotency_key = p_idempotency_key;
    IF v_existing.id IS NOT NULL THEN
      RETURN json_build_object('success', true, 'duplicate', true);
    END IF;
  END IF;

  -- Dedupe por telefone na mesma landing em 30 minutos
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

  INSERT INTO public.product_landing_leads (
    landing_id, user_id, product_key, client_id, opportunity_id,
    lead_name, lead_phone, lead_email, origin_city, travel_period,
    adults, children, children_ages, interest_category, message,
    consent_accepted, consent_at,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    referrer, page_url, user_agent, idempotency_key
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
    left(NULLIF(p_idempotency_key,''), 120)
  )
  RETURNING id INTO v_lead_id;

  UPDATE public.agency_product_landings
  SET leads_count = leads_count + 1
  WHERE id = v_landing.id;

  RETURN json_build_object('success', true, 'lead_id', v_lead_id);
END;
$$;

REVOKE ALL ON FUNCTION public.submit_product_landing_lead(text, text, jsonb, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_product_landing_lead(text, text, jsonb, text) TO anon, authenticated, service_role;

-- 8) Disponibilidade de slug (autenticado)
CREATE OR REPLACE FUNCTION public.check_public_slug_available(p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_norm text := public.normalize_public_slug(p_slug);
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN json_build_object('available', false, 'reason', 'unauthenticated');
  END IF;
  IF v_norm IS NULL OR length(v_norm) < 3 THEN
    RETURN json_build_object('available', false, 'normalized', v_norm, 'reason', 'too_short');
  END IF;
  IF public.is_reserved_slug(v_norm) THEN
    RETURN json_build_object('available', false, 'normalized', v_norm, 'reason', 'reserved');
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE public_slug = v_norm AND user_id <> auth.uid()
  ) THEN
    RETURN json_build_object('available', false, 'normalized', v_norm, 'reason', 'taken');
  END IF;
  RETURN json_build_object('available', true, 'normalized', v_norm);
END;
$$;

REVOKE ALL ON FUNCTION public.check_public_slug_available(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_public_slug_available(text) TO authenticated, service_role;