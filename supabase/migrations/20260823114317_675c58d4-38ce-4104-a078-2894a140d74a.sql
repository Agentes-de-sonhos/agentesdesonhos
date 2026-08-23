-- =============================================================
-- ETAPA 1 — Área do Cliente White Label: acesso e autenticação
-- =============================================================

-- 1) Elegibilidade: somente agências com White Label ativo
CREATE OR REPLACE FUNCTION public.agency_has_client_area(_agency_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT _agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.agency_public_domains d
      WHERE d.user_id = _agency_id AND d.is_active
    );
$$;

REVOKE ALL ON FUNCTION public.agency_has_client_area(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_has_client_area(uuid) TO authenticated, service_role;

-- 2) Contas de acesso do cliente final
CREATE TABLE public.client_area_accounts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  email_normalized text NOT NULL,
  password_hash text NOT NULL,
  status text NOT NULL DEFAULT 'active',
  must_change_password boolean NOT NULL DEFAULT false,
  password_updated_at timestamp with time zone NOT NULL DEFAULT now(),
  password_set_by text NOT NULL DEFAULT 'agency_generated',
  first_login_at timestamp with time zone,
  last_login_at timestamp with time zone,
  login_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_area_accounts_status_chk CHECK (status IN ('active', 'blocked')),
  CONSTRAINT client_area_accounts_pwd_src_chk CHECK (password_set_by IN ('agency_generated', 'agency_defined', 'client_changed')),
  CONSTRAINT client_area_accounts_client_unique UNIQUE (client_id),
  CONSTRAINT client_area_accounts_agency_email_unique UNIQUE (agency_id, email_normalized)
);

CREATE INDEX idx_client_area_accounts_agency ON public.client_area_accounts(agency_id);
CREATE INDEX idx_client_area_accounts_lookup ON public.client_area_accounts(agency_id, email_normalized);

GRANT ALL ON public.client_area_accounts TO service_role;
ALTER TABLE public.client_area_accounts ENABLE ROW LEVEL SECURITY;
-- Sem policies e sem GRANT para anon/authenticated: acesso somente pelo servidor
-- (Edge Functions com service_role) e por funções SECURITY DEFINER auditadas.

-- 3) Sessões do cliente final
CREATE TABLE public.client_area_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES public.client_area_accounts(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  revoked_at timestamp with time zone,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_client_area_sessions_account ON public.client_area_sessions(account_id);

GRANT ALL ON public.client_area_sessions TO service_role;
ALTER TABLE public.client_area_sessions ENABLE ROW LEVEL SECURITY;

-- 4) Controle de tentativas (também cobre e-mails inexistentes, evitando enumeração)
CREATE TABLE public.client_area_login_attempts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  email_normalized text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  first_attempt_at timestamp with time zone NOT NULL DEFAULT now(),
  locked_until timestamp with time zone,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_area_attempts_unique UNIQUE (agency_id, email_normalized)
);

GRANT ALL ON public.client_area_login_attempts TO service_role;
ALTER TABLE public.client_area_login_attempts ENABLE ROW LEVEL SECURITY;

-- 5) Auditoria (nunca guarda senha, hash, token ou link secreto)
CREATE TABLE public.client_area_audit_log (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  agency_id uuid NOT NULL,
  account_id uuid,
  client_id uuid,
  action text NOT NULL,
  actor text NOT NULL DEFAULT 'system',
  actor_user_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  user_agent text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT client_area_audit_actor_chk CHECK (actor IN ('agency', 'client', 'system'))
);

CREATE INDEX idx_client_area_audit_agency ON public.client_area_audit_log(agency_id, created_at DESC);
CREATE INDEX idx_client_area_audit_client ON public.client_area_audit_log(client_id, created_at DESC);

GRANT ALL ON public.client_area_audit_log TO service_role;
ALTER TABLE public.client_area_audit_log ENABLE ROW LEVEL SECURITY;

-- 6) updated_at
CREATE TRIGGER update_client_area_accounts_updated_at
BEFORE UPDATE ON public.client_area_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 7) Catálogo de permissões: gerenciar acesso do cliente
INSERT INTO public.team_permission_catalog (permission_key, module_key, label, is_sensitive)
VALUES ('clients.manage_access', 'clients', 'Gerenciar acesso do cliente à Área do Cliente', true)
ON CONFLICT (permission_key) DO UPDATE
  SET module_key = EXCLUDED.module_key,
      label = EXCLUDED.label,
      is_sensitive = EXCLUDED.is_sensitive;

-- 8) Contexto do ator (agência) — usado pelas Edge Functions e pela interface
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
BEGIN
  IF v_uid IS NULL THEN
    RETURN json_build_object('authenticated', false, 'can_manage', false, 'white_label_active', false);
  END IF;

  SELECT m.id, m.agency_id, m.status INTO v_member
  FROM public.agency_team_members m
  WHERE m.auth_user_id = v_uid
  LIMIT 1;

  v_agency := public.resolve_agency_id_for_user(v_uid);

  IF v_member.id IS NULL THEN
    v_can := true; -- proprietário/master da agência
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

  RETURN json_build_object(
    'authenticated', true,
    'agency_id', v_agency,
    'is_team_member', v_member.id IS NOT NULL,
    'white_label_active', public.agency_has_client_area(v_agency),
    'can_manage', v_can AND public.agency_has_client_area(v_agency)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.client_area_admin_context() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_area_admin_context() TO authenticated, service_role;

-- 9) Status da conta de um cliente (somente dados não sensíveis, mesma agência)
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
  v_history json;
BEGIN
  IF v_uid IS NULL OR _client_id IS NULL THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_agency := public.resolve_agency_id_for_user(v_uid);

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

  SELECT COALESCE(json_agg(json_build_object(
           'action', l.action, 'actor', l.actor, 'created_at', l.created_at
         ) ORDER BY l.created_at DESC), '[]'::json)
    INTO v_history
  FROM (
    SELECT * FROM public.client_area_audit_log
    WHERE client_id = _client_id AND agency_id = v_agency
    ORDER BY created_at DESC LIMIT 10
  ) l;

  RETURN json_build_object(
    'client_id', _client_id,
    'agency_id', v_agency,
    'white_label_active', public.agency_has_client_area(v_agency),
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