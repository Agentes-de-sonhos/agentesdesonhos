-- Etapa 1 — Painel Administrativo White Label das Agências

-- 1) Flag de habilitação individual por domínio (padrão: desativado)
ALTER TABLE public.agency_public_domains
  ADD COLUMN IF NOT EXISTS admin_portal_enabled boolean NOT NULL DEFAULT false;

-- 2) Branding do portal administrativo (leitura pública, apenas domínios ativos)
CREATE OR REPLACE FUNCTION public.get_agency_admin_portal(p_hostname text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_enabled boolean;
  v_base jsonb;
BEGIN
  SELECT d.admin_portal_enabled INTO v_enabled
    FROM public.agency_public_domains d
   WHERE d.hostname = lower(trim(p_hostname))
     AND d.is_active = true
   LIMIT 1;

  IF v_enabled IS NULL THEN
    RETURN NULL;
  END IF;

  v_base := public.get_agency_domain(p_hostname);
  IF v_base IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_base || jsonb_build_object('admin_portal_enabled', v_enabled);
END;
$$;

-- 3) Verificação server-side: usuário autenticado pertence à agência do domínio?
CREATE OR REPLACE FUNCTION public.agency_admin_access_check(p_hostname text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_agency uuid;
  v_enabled boolean;
  v_allowed boolean := false;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  SELECT d.user_id, d.admin_portal_enabled
    INTO v_agency, v_enabled
    FROM public.agency_public_domains d
   WHERE d.hostname = lower(trim(p_hostname))
     AND d.is_active = true
   LIMIT 1;

  IF v_agency IS NULL OR NOT v_enabled THEN
    RETURN jsonb_build_object('allowed', false);
  END IF;

  IF public.is_user_active(v_uid) THEN
    v_allowed := v_agency = v_uid
      OR EXISTS (
        SELECT 1
          FROM public.agency_membership m
         WHERE m.user_id = v_uid
           AND m.agency_id = v_agency
      );
  END IF;

  RETURN jsonb_build_object('allowed', v_allowed);
END;
$$;

-- 4) Admin da plataforma: ativar/desativar o painel por domínio (com auditoria)
CREATE OR REPLACE FUNCTION public.admin_whitelabel_set_admin_portal(_domain_id uuid, _enabled boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT user_id INTO v_agency FROM public.agency_public_domains WHERE id = _domain_id;
  IF v_agency IS NULL THEN
    RAISE EXCEPTION 'Domínio não encontrado';
  END IF;

  UPDATE public.agency_public_domains
     SET admin_portal_enabled = _enabled
   WHERE id = _domain_id AND admin_portal_enabled <> _enabled;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action, details)
  VALUES (auth.uid(), v_agency, 'whitelabel_set_admin_portal',
          jsonb_build_object('domain_id', _domain_id, 'admin_portal_enabled', _enabled));

  RETURN public.admin_whitelabel_status(v_agency);
END;
$$;

-- 5) Status white label passa a expor a flag por domínio (para o diálogo admin)
CREATE OR REPLACE FUNCTION public.admin_whitelabel_status(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency uuid;
  v_sub record;
  v_domains json;
  v_primary text;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_agency := public.resolve_agency_id_for_user(_user_id);

  SELECT s.plan::text AS plan, s.is_active, s.expires_at
    INTO v_sub
  FROM public.subscriptions s
  WHERE s.user_id = v_agency
  ORDER BY s.is_active DESC, s.created_at DESC
  LIMIT 1;

  SELECT json_agg(json_build_object(
           'id', d.id,
           'hostname', d.hostname,
           'agency_slug', d.agency_slug,
           'is_primary', d.is_primary,
           'is_active', d.is_active,
           'admin_portal_enabled', d.admin_portal_enabled,
           'created_at', d.created_at
         ) ORDER BY d.is_primary DESC, d.hostname)
    INTO v_domains
  FROM public.agency_public_domains d
  WHERE d.user_id = v_agency;

  SELECT d.hostname INTO v_primary
  FROM public.agency_public_domains d
  WHERE d.user_id = v_agency AND d.is_active
  ORDER BY d.is_primary DESC, d.created_at
  LIMIT 1;

  RETURN json_build_object(
    'agency_id', v_agency,
    'is_team_member', v_agency <> _user_id,
    'agency_name', (SELECT p.agency_name FROM public.profiles p WHERE p.user_id = v_agency),
    'owner_name', (SELECT p.name FROM public.profiles p WHERE p.user_id = v_agency),
    'owner_email', (SELECT u.email::text FROM auth.users u WHERE u.id = v_agency),
    'plan', v_sub.plan,
    'subscription_is_active', COALESCE(v_sub.is_active, false),
    'expires_at', v_sub.expires_at,
    'is_premium', v_sub.plan = 'premium',
    'is_current', (v_sub.expires_at IS NULL OR v_sub.expires_at > now()),
    'has_active_domain', EXISTS (
      SELECT 1 FROM public.agency_public_domains d
      WHERE d.user_id = v_agency AND d.is_active
    ),
    'primary_hostname', v_primary,
    'eligible', public.agency_can_use_booking_requests(v_agency),
    'domains', COALESCE(v_domains, '[]'::json)
  );
END;
$$;