
-- ============================================================
-- USUÁRIOS DA EQUIPE (subusuários internos da agência)
-- ============================================================

-- Enum de status
DO $$ BEGIN
  CREATE TYPE public.team_member_status AS ENUM ('active', 'blocked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.team_pipeline_type AS ENUM ('opportunities', 'operations');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- 1) Membros
CREATE TABLE public.agency_team_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  login TEXT NOT NULL,
  login_normalized TEXT GENERATED ALWAYS AS (lower(login)) STORED,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role_title TEXT,
  status public.team_member_status NOT NULL DEFAULT 'active',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (login_normalized)
);
CREATE INDEX idx_agency_team_members_agency ON public.agency_team_members(agency_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_team_members TO authenticated;
GRANT ALL ON public.agency_team_members TO service_role;
ALTER TABLE public.agency_team_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own team members"
ON public.agency_team_members FOR ALL
TO authenticated
USING (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id);

CREATE TRIGGER update_agency_team_members_updated_at
BEFORE UPDATE ON public.agency_team_members
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Limite de 6 membros ativos por agência
CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status = 'active')
     OR (TG_OP = 'UPDATE' AND NEW.status = 'active' AND OLD.status <> 'active') THEN
    SELECT COUNT(*) INTO total
    FROM public.agency_team_members
    WHERE agency_id = NEW.agency_id AND status = 'active' AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    IF total >= 6 THEN
      RAISE EXCEPTION 'Limite de 6 usuários ativos por agência atingido'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_enforce_team_member_limit
BEFORE INSERT OR UPDATE ON public.agency_team_members
FOR EACH ROW EXECUTE FUNCTION public.enforce_team_member_limit();

-- 2) Permissões por módulo/ação
CREATE TABLE public.agency_team_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  team_member_id UUID NOT NULL REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  module_key TEXT NOT NULL,
  permission_key TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, permission_key)
);
CREATE INDEX idx_team_perms_member ON public.agency_team_permissions(team_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_team_permissions TO authenticated;
GRANT ALL ON public.agency_team_permissions TO service_role;
ALTER TABLE public.agency_team_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own team permissions"
ON public.agency_team_permissions FOR ALL
TO authenticated
USING (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id);

-- 3) Permissões por etapa do funil
CREATE TABLE public.agency_team_stage_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  team_member_id UUID NOT NULL REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  pipeline_type public.team_pipeline_type NOT NULL,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id) ON DELETE CASCADE,
  can_view BOOLEAN NOT NULL DEFAULT true,
  can_edit BOOLEAN NOT NULL DEFAULT false,
  can_move BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, pipeline_type, stage_id)
);
CREATE INDEX idx_team_stage_perms_member ON public.agency_team_stage_permissions(team_member_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_team_stage_permissions TO authenticated;
GRANT ALL ON public.agency_team_stage_permissions TO service_role;
ALTER TABLE public.agency_team_stage_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages own team stage permissions"
ON public.agency_team_stage_permissions FOR ALL
TO authenticated
USING (auth.uid() = agency_id)
WITH CHECK (auth.uid() = agency_id);

-- 4) Sessões dos subusuários (acesso somente via Edge Function / service_role)
CREATE TABLE public.agency_team_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_member_id UUID NOT NULL REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_sessions_member ON public.agency_team_sessions(team_member_id);
CREATE INDEX idx_team_sessions_expires ON public.agency_team_sessions(expires_at);

GRANT ALL ON public.agency_team_sessions TO service_role;
ALTER TABLE public.agency_team_sessions ENABLE ROW LEVEL SECURITY;
-- Sem policy para authenticated: apenas service_role acessa.

-- 5) Auditoria
CREATE TABLE public.agency_team_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  team_member_id UUID,
  action TEXT NOT NULL,
  details JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_team_audit_agency ON public.agency_team_audit_log(agency_id, created_at DESC);

GRANT SELECT ON public.agency_team_audit_log TO authenticated;
GRANT ALL ON public.agency_team_audit_log TO service_role;
ALTER TABLE public.agency_team_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own team audit"
ON public.agency_team_audit_log FOR SELECT
TO authenticated
USING (auth.uid() = agency_id);

-- ============================================================
-- RPCs SECURITY DEFINER (uso pelo dono autenticado)
-- ============================================================

-- Lista membros + contagem ativa
CREATE OR REPLACE FUNCTION public.team_list_members()
RETURNS TABLE (
  id UUID, login TEXT, full_name TEXT, role_title TEXT,
  status public.team_member_status, last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  permissions_count BIGINT, stage_permissions_count BIGINT
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    m.id, m.login, m.full_name, m.role_title, m.status, m.last_login_at, m.created_at,
    (SELECT COUNT(*) FROM public.agency_team_permissions p WHERE p.team_member_id = m.id AND p.enabled),
    (SELECT COUNT(*) FROM public.agency_team_stage_permissions s WHERE s.team_member_id = m.id)
  FROM public.agency_team_members m
  WHERE m.agency_id = auth.uid()
  ORDER BY m.created_at DESC;
$$;

-- Conta vagas restantes
CREATE OR REPLACE FUNCTION public.team_member_quota()
RETURNS TABLE (used INT, total INT)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COUNT(*)::int, 6 FROM public.agency_team_members
  WHERE agency_id = auth.uid() AND status = 'active';
$$;

-- Snapshot de permissões para o editor
CREATE OR REPLACE FUNCTION public.team_get_member_detail(_member_id UUID)
RETURNS JSON LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  m RECORD; perms JSON; stage_perms JSON;
BEGIN
  SELECT * INTO m FROM public.agency_team_members
  WHERE id = _member_id AND agency_id = auth.uid();
  IF m IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'module_key', module_key, 'permission_key', permission_key, 'enabled', enabled
  )), '[]'::json) INTO perms
  FROM public.agency_team_permissions WHERE team_member_id = _member_id;

  SELECT COALESCE(json_agg(json_build_object(
    'pipeline_type', pipeline_type, 'stage_id', stage_id,
    'can_view', can_view, 'can_edit', can_edit, 'can_move', can_move
  )), '[]'::json) INTO stage_perms
  FROM public.agency_team_stage_permissions WHERE team_member_id = _member_id;

  RETURN json_build_object(
    'id', m.id, 'login', m.login, 'full_name', m.full_name,
    'role_title', m.role_title, 'status', m.status,
    'last_login_at', m.last_login_at, 'created_at', m.created_at,
    'permissions', perms, 'stage_permissions', stage_perms
  );
END $$;

-- Substituir conjunto de permissões (chamado pelo Edge Function team-admin após validar dono)
CREATE OR REPLACE FUNCTION public.team_replace_permissions(
  _member_id UUID,
  _permissions JSONB,         -- [{module_key, permission_key, enabled}]
  _stage_permissions JSONB    -- [{pipeline_type, stage_id, can_view, can_edit, can_move}]
)
RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_agency UUID;
BEGIN
  SELECT agency_id INTO v_agency FROM public.agency_team_members WHERE id = _member_id;
  IF v_agency IS NULL OR v_agency <> auth.uid() THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  DELETE FROM public.agency_team_permissions WHERE team_member_id = _member_id;
  IF _permissions IS NOT NULL AND jsonb_array_length(_permissions) > 0 THEN
    INSERT INTO public.agency_team_permissions (agency_id, team_member_id, module_key, permission_key, enabled)
    SELECT v_agency, _member_id,
      x->>'module_key', x->>'permission_key', COALESCE((x->>'enabled')::boolean, true)
    FROM jsonb_array_elements(_permissions) x
    WHERE COALESCE((x->>'enabled')::boolean, true) = true;
  END IF;

  DELETE FROM public.agency_team_stage_permissions WHERE team_member_id = _member_id;
  IF _stage_permissions IS NOT NULL AND jsonb_array_length(_stage_permissions) > 0 THEN
    INSERT INTO public.agency_team_stage_permissions
      (agency_id, team_member_id, pipeline_type, stage_id, can_view, can_edit, can_move)
    SELECT v_agency, _member_id,
      (x->>'pipeline_type')::public.team_pipeline_type,
      (x->>'stage_id')::uuid,
      COALESCE((x->>'can_view')::boolean, false),
      COALESCE((x->>'can_edit')::boolean, false),
      COALESCE((x->>'can_move')::boolean, false)
    FROM jsonb_array_elements(_stage_permissions) x;
  END IF;
END $$;

GRANT EXECUTE ON FUNCTION public.team_list_members() TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_member_quota() TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_get_member_detail(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.team_replace_permissions(UUID, JSONB, JSONB) TO authenticated;
