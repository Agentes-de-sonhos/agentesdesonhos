-- =============================================================
-- ETAPA 1.1 — Estabilização da Área do Cliente White Label
-- =============================================================

-- 1) Elegibilidade canônica: reutiliza a regra oficial da plataforma
--    (plano Premium ativo/vigente + domínio White Label ativo).
CREATE OR REPLACE FUNCTION public.agency_has_client_area(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.agency_can_use_booking_requests(_agency_id);
$$;

REVOKE ALL ON FUNCTION public.agency_has_client_area(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_has_client_area(uuid) TO authenticated, service_role;

-- 2) Contexto do domínio White Label (usado somente pelo servidor).
--    Normaliza o hostname, exige domínio ativo e elegibilidade canônica.
CREATE OR REPLACE FUNCTION public.client_area_domain_context(_hostname text)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_host text := public.normalize_public_hostname(_hostname);
  v_dom record;
  v_agency uuid;
BEGIN
  IF v_host IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'missing_hostname');
  END IF;

  SELECT d.user_id, d.agency_slug, d.hostname, d.is_active
    INTO v_dom
  FROM public.agency_public_domains d
  WHERE d.hostname = v_host
  ORDER BY d.is_active DESC, d.is_primary DESC, d.created_at
  LIMIT 1;

  IF v_dom.user_id IS NULL THEN
    RETURN json_build_object('ok', false, 'reason', 'unknown_hostname', 'hostname', v_host);
  END IF;

  IF NOT COALESCE(v_dom.is_active, false) THEN
    RETURN json_build_object('ok', false, 'reason', 'inactive_domain', 'hostname', v_host);
  END IF;

  v_agency := public.resolve_agency_id_for_user(v_dom.user_id);

  IF NOT public.agency_has_client_area(v_agency) THEN
    RETURN json_build_object('ok', false, 'reason', 'not_eligible', 'hostname', v_host);
  END IF;

  RETURN json_build_object(
    'ok', true,
    'hostname', v_host,
    'agency_id', v_agency,
    'agency_slug', v_dom.agency_slug,
    'agency_name', (SELECT COALESCE(NULLIF(btrim(p.agency_name), ''), p.name)
                      FROM public.profiles p WHERE p.user_id = v_agency),
    'whatsapp', (SELECT p.phone FROM public.profiles p WHERE p.user_id = v_agency)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.client_area_domain_context(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.client_area_domain_context(text) TO service_role;

-- 3) Tentativas por origem (mitiga pulverização e bloqueio proposital de contas).
--    A origem nunca é armazenada em texto aberto: apenas um hash com pepper.
CREATE TABLE IF NOT EXISTS public.client_area_origin_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid,
  origin_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  distinct_emails integer NOT NULL DEFAULT 0,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_area_origin_attempts_unique UNIQUE (agency_id, origin_hash)
);

CREATE INDEX IF NOT EXISTS idx_client_area_origin_attempts_lookup
  ON public.client_area_origin_attempts(origin_hash, agency_id);

GRANT ALL ON public.client_area_origin_attempts TO service_role;
ALTER TABLE public.client_area_origin_attempts ENABLE ROW LEVEL SECURITY;
-- Sem policies e sem GRANT para anon/authenticated: acesso apenas pelo servidor.

-- 4) Sessões: rotação e prazo absoluto
ALTER TABLE public.client_area_sessions
  ADD COLUMN IF NOT EXISTS rotated_at timestamp with time zone NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS absolute_expires_at timestamp with time zone;

UPDATE public.client_area_sessions
   SET absolute_expires_at = COALESCE(absolute_expires_at, created_at + interval '180 days');

-- 5) Contexto do ator: associação de equipe sem ambiguidade + elegibilidade canônica
CREATE OR REPLACE FUNCTION public.client_area_admin_context()
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_member record;
  v_agency uuid;
  v_can boolean;
  v_eligible boolean;
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('authenticated', false, 'can_manage', false, 'white_label_active', false);
  END IF;

  v_agency := public.resolve_agency_id_for_user(v_uid);

  -- A associação considerada é sempre a da agência efetivamente administrada,
  -- priorizando associações ativas (nunca um LIMIT 1 ambíguo).
  SELECT m.id, m.agency_id, m.status INTO v_member
  FROM public.agency_team_members m
  WHERE m.auth_user_id = v_uid
    AND m.agency_id = v_agency
  ORDER BY (m.status = 'active') DESC, m.created_at
  LIMIT 1;

  IF v_member.id IS NULL THEN
    -- Sem associação nesta agência: só é master se a agência resolvida é ele mesmo.
    v_can := (v_agency = v_uid);
  ELSIF COALESCE(v_member.status, '') <> 'active' THEN
    v_can := false;
  ELSE
    v_can := EXISTS (
      SELECT 1 FROM public.agency_team_permissions p
      WHERE p.team_member_id = v_member.id
        AND p.permission_key = 'clients.manage_access'
        AND p.enabled
    );
  END IF;

  v_eligible := public.agency_has_client_area(v_agency);

  RETURN json_build_object(
    'authenticated', true,
    'agency_id', v_agency,
    'is_team_member', v_member.id IS NOT NULL,
    'white_label_active', v_eligible,
    'can_manage', v_can AND v_eligible
  );
END;
$$;

REVOKE ALL ON FUNCTION public.client_area_admin_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_area_admin_context() TO authenticated, service_role;

-- 6) Status da conta: histórico de segurança apenas para quem pode gerenciar acesso
CREATE OR REPLACE FUNCTION public.client_area_account_status(_client_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_agency uuid;
  v_client_agency uuid;
  v_client record;
  v_acc record;
  v_ctx json;
  v_can boolean;
  v_history json := '[]'::json;
BEGIN
  IF v_uid IS NULL OR _client_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_ctx := public.client_area_admin_context();
  v_agency := NULLIF(v_ctx->>'agency_id', '')::uuid;
  v_can := COALESCE((v_ctx->>'can_manage')::boolean, false);

  IF v_agency IS NULL THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT c.id, c.name, c.email, c.user_id INTO v_client
  FROM public.clients c WHERE c.id = _client_id;

  IF v_client.id IS NULL THEN
    RAISE EXCEPTION 'Cliente não encontrado';
  END IF;

  v_client_agency := public.resolve_agency_id_for_user(v_client.user_id);
  IF v_client_agency IS DISTINCT FROM v_agency THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  SELECT a.id, a.status, a.email_normalized, a.first_login_at, a.last_login_at,
         a.login_count, a.password_updated_at, a.password_set_by, a.created_at
    INTO v_acc
  FROM public.client_area_accounts a
  WHERE a.client_id = _client_id AND a.agency_id = v_agency;

  IF v_can THEN
    SELECT COALESCE(json_agg(json_build_object(
             'action', l.action, 'actor', l.actor, 'created_at', l.created_at
           ) ORDER BY l.created_at DESC), '[]'::json)
      INTO v_history
    FROM (
      SELECT * FROM public.client_area_audit_log
      WHERE client_id = _client_id AND agency_id = v_agency
      ORDER BY created_at DESC LIMIT 10
    ) l;
  END IF;

  RETURN json_build_object(
    'client_id', _client_id,
    'agency_id', v_agency,
    'white_label_active', COALESCE((v_ctx->>'white_label_active')::boolean, false),
    'can_manage', v_can,
    'has_email', COALESCE(btrim(v_client.email), '') <> '',
    'email', v_client.email,
    'exists', v_acc.id IS NOT NULL,
    'status', v_acc.status,
    'login_email', v_acc.email_normalized,
    'first_login_at', v_acc.first_login_at,
    'last_login_at', v_acc.last_login_at,
    'login_count', COALESCE(v_acc.login_count, 0),
    'password_updated_at', v_acc.password_updated_at,
    'password_set_by', v_acc.password_set_by,
    'created_at', v_acc.created_at,
    'history', v_history
  );
END;
$$;

REVOKE ALL ON FUNCTION public.client_area_account_status(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_area_account_status(uuid) TO authenticated, service_role;