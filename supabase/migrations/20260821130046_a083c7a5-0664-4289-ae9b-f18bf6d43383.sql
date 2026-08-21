-- 1) Normalização de hostname reutilizável
CREATE OR REPLACE FUNCTION public.normalize_public_hostname(_raw text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT NULLIF(
    regexp_replace(
      regexp_replace(
        regexp_replace(lower(btrim(COALESCE(_raw, ''))), '^[a-z]+://', ''),
        '[/?#].*$', ''
      ),
      ':\d+$', ''
    ),
    ''
  );
$$;

-- 2) Backfill/automação: habilita a solicitação nos orçamentos de UMA agência elegível
CREATE OR REPLACE FUNCTION public.sync_agency_booking_requests(_agency_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_count integer := 0;
BEGIN
  IF _agency_id IS NULL THEN
    RETURN 0;
  END IF;
  IF NOT public.agency_can_use_booking_requests(_agency_id) THEN
    RETURN 0;
  END IF;

  WITH upd AS (
    UPDATE public.quotes q
       SET booking_requests_enabled = true
     WHERE COALESCE(q.booking_requests_enabled, false) = false
       AND public.resolve_agency_id_for_user(q.user_id) = _agency_id
    RETURNING 1
  )
  SELECT count(*) INTO v_count FROM upd;

  RETURN v_count;
END;
$$;

-- 3) Trigger de orçamento: força o estado correto (nunca depende do frontend)
CREATE OR REPLACE FUNCTION public.enforce_quote_booking_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid;
  v_eligible boolean;
BEGIN
  v_agency := public.resolve_agency_id_for_user(NEW.user_id);
  v_eligible := public.agency_can_use_booking_requests(v_agency);

  IF v_eligible THEN
    -- Agência elegível: sempre habilitado (novos orçamentos e tentativas de desligar).
    NEW.booking_requests_enabled := true;
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.booking_requests_enabled, false) THEN
    RAISE EXCEPTION 'Solicitacao de reserva disponivel apenas para agencias Premium com site White Label ativo';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quote_booking_entitlement ON public.quotes;
CREATE TRIGGER trg_enforce_quote_booking_entitlement
BEFORE INSERT OR UPDATE OF booking_requests_enabled ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_booking_entitlement();

-- 4) Elegibilidade futura: assinaturas e domínios disparam a sincronização
CREATE OR REPLACE FUNCTION public.trg_sync_booking_requests_from_subscription()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_agency_booking_requests(NEW.user_id);
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_sync_booking_requests ON public.subscriptions;
CREATE TRIGGER trg_subscriptions_sync_booking_requests
AFTER INSERT OR UPDATE OF plan, is_active, expires_at ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_booking_requests_from_subscription();

CREATE OR REPLACE FUNCTION public.trg_sync_booking_requests_from_domain()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_agency_booking_requests(
    public.resolve_agency_id_for_user(COALESCE(NEW.user_id, OLD.user_id))
  );
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_agency_domains_sync_booking_requests ON public.agency_public_domains;
CREATE TRIGGER trg_agency_domains_sync_booking_requests
AFTER INSERT OR UPDATE OF is_active, user_id ON public.agency_public_domains
FOR EACH ROW EXECUTE FUNCTION public.trg_sync_booking_requests_from_domain();

-- 5) Backfill idempotente de todas as agências atualmente elegíveis
DO $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT d.user_id AS agency_id
    FROM public.agency_public_domains d
    WHERE d.is_active
  LOOP
    PERFORM public.sync_agency_booking_requests(r.agency_id);
  END LOOP;
END $$;

-- 6) Status consolidado para o Admin (fonte de verdade única no servidor)
CREATE OR REPLACE FUNCTION public.admin_whitelabel_status(_user_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
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

-- 7) Assinatura: plano / atividade / validade
CREATE OR REPLACE FUNCTION public.admin_whitelabel_set_subscription(
  _user_id uuid,
  _plan text DEFAULT NULL,
  _is_active boolean DEFAULT NULL,
  _expires_at timestamptz DEFAULT NULL,
  _clear_expires boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_agency := public.resolve_agency_id_for_user(_user_id);

  INSERT INTO public.subscriptions (user_id, plan, is_active, expires_at)
  VALUES (
    v_agency,
    COALESCE(_plan, 'essencial')::subscription_plan,
    COALESCE(_is_active, true),
    CASE WHEN _clear_expires THEN NULL ELSE _expires_at END
  )
  ON CONFLICT (user_id) DO UPDATE
    SET plan = COALESCE(_plan::subscription_plan, public.subscriptions.plan),
        is_active = COALESCE(_is_active, public.subscriptions.is_active),
        expires_at = CASE
          WHEN _clear_expires THEN NULL
          WHEN _expires_at IS NOT NULL THEN _expires_at
          ELSE public.subscriptions.expires_at
        END,
        updated_at = now();

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action, details)
  VALUES (auth.uid(), v_agency, 'whitelabel_set_subscription',
          jsonb_build_object('plan', _plan, 'is_active', _is_active,
                             'expires_at', _expires_at, 'clear_expires', _clear_expires));

  PERFORM public.sync_agency_booking_requests(v_agency);
  RETURN public.admin_whitelabel_status(v_agency);
END;
$$;

-- 8) Domínios: criar / atualizar
CREATE OR REPLACE FUNCTION public.admin_whitelabel_upsert_domain(
  _user_id uuid,
  _hostname text,
  _agency_slug text,
  _domain_id uuid DEFAULT NULL,
  _is_primary boolean DEFAULT NULL,
  _is_active boolean DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid;
  v_host text;
  v_slug text;
  v_id uuid;
  v_primary boolean;
  v_active boolean;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_agency := public.resolve_agency_id_for_user(_user_id);
  v_host := public.normalize_public_hostname(_hostname);
  v_slug := lower(btrim(COALESCE(_agency_slug, '')));

  IF v_host IS NULL OR v_host !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$' THEN
    RAISE EXCEPTION 'Informe um domínio válido (ex.: minhaagencia.com.br)';
  END IF;
  IF v_slug = '' OR v_slug !~ '^[a-z0-9]([a-z0-9-]*[a-z0-9])?$' THEN
    RAISE EXCEPTION 'Slug inválido: use apenas letras minúsculas, números e hífen';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.agency_public_domains d
    WHERE d.hostname = v_host AND (_domain_id IS NULL OR d.id <> _domain_id)
  ) THEN
    RAISE EXCEPTION 'Este domínio já está cadastrado (possivelmente em outra agência)';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.agency_public_domains d
    WHERE d.agency_slug = v_slug
      AND d.user_id <> v_agency
  ) THEN
    RAISE EXCEPTION 'Este slug já pertence a outra agência';
  END IF;

  IF _domain_id IS NOT NULL THEN
    SELECT d.is_primary, d.is_active INTO v_primary, v_active
    FROM public.agency_public_domains d
    WHERE d.id = _domain_id AND d.user_id = v_agency;
    IF NOT FOUND THEN
      RAISE EXCEPTION 'Domínio não encontrado para esta agência';
    END IF;

    UPDATE public.agency_public_domains
       SET hostname = v_host,
           agency_slug = v_slug,
           is_primary = COALESCE(_is_primary, v_primary),
           is_active = COALESCE(_is_active, v_active)
     WHERE id = _domain_id
    RETURNING id INTO v_id;
  ELSE
    v_primary := COALESCE(_is_primary, NOT EXISTS (
      SELECT 1 FROM public.agency_public_domains d WHERE d.user_id = v_agency
    ));
    INSERT INTO public.agency_public_domains (user_id, hostname, agency_slug, is_primary, is_active)
    VALUES (v_agency, v_host, v_slug, v_primary, COALESCE(_is_active, true))
    RETURNING id, is_primary INTO v_id, v_primary;
  END IF;

  -- Um único principal por agência (atômico)
  IF COALESCE(v_primary, false) THEN
    UPDATE public.agency_public_domains
       SET is_primary = false
     WHERE user_id = v_agency AND id <> v_id AND is_primary;
  END IF;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action, details)
  VALUES (auth.uid(), v_agency, 'whitelabel_upsert_domain',
          jsonb_build_object('domain_id', v_id, 'hostname', v_host, 'agency_slug', v_slug,
                             'is_primary', _is_primary, 'is_active', _is_active));

  PERFORM public.sync_agency_booking_requests(v_agency);
  RETURN public.admin_whitelabel_status(v_agency);
END;
$$;

-- 9) Domínios: principal
CREATE OR REPLACE FUNCTION public.admin_whitelabel_set_primary_domain(_domain_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
     SET is_primary = (id = _domain_id)
   WHERE user_id = v_agency
     AND is_primary <> (id = _domain_id);

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action, details)
  VALUES (auth.uid(), v_agency, 'whitelabel_set_primary_domain',
          jsonb_build_object('domain_id', _domain_id));

  RETURN public.admin_whitelabel_status(v_agency);
END;
$$;

-- 10) Domínios: ativar / desativar
CREATE OR REPLACE FUNCTION public.admin_whitelabel_set_domain_active(_domain_id uuid, _is_active boolean)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
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
     SET is_active = _is_active
   WHERE id = _domain_id AND is_active <> _is_active;

  INSERT INTO public.admin_action_logs (admin_user_id, target_user_id, action, details)
  VALUES (auth.uid(), v_agency, 'whitelabel_set_domain_active',
          jsonb_build_object('domain_id', _domain_id, 'is_active', _is_active));

  PERFORM public.sync_agency_booking_requests(v_agency);
  RETURN public.admin_whitelabel_status(v_agency);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_whitelabel_status(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_whitelabel_set_subscription(uuid, text, boolean, timestamptz, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_whitelabel_upsert_domain(uuid, text, text, uuid, boolean, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_whitelabel_set_primary_domain(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_whitelabel_set_domain_active(uuid, boolean) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.sync_agency_booking_requests(uuid) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_whitelabel_status(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_whitelabel_set_subscription(uuid, text, boolean, timestamptz, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_whitelabel_upsert_domain(uuid, text, text, uuid, boolean, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_whitelabel_set_primary_domain(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_whitelabel_set_domain_active(uuid, boolean) TO authenticated;