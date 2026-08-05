-- ============================================================
-- 1. ENUM: novos status (aditivo)
-- ============================================================
ALTER TYPE public.team_member_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE public.team_member_status ADD VALUE IF NOT EXISTS 'disabled';

DO $$ BEGIN
  CREATE TYPE public.team_data_scope AS ENUM ('own','created','assigned','team','department','agency');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ============================================================
-- 2. Colunas aditivas em agency_team_members
-- ============================================================
ALTER TABLE public.agency_team_members
  ADD COLUMN IF NOT EXISTS email text,
  ADD COLUMN IF NOT EXISTS phone text,
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS department text,
  ADD COLUMN IF NOT EXISTS team_name text,
  ADD COLUMN IF NOT EXISTS access_profile_id uuid,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS deactivated_at timestamptz,
  ADD COLUMN IF NOT EXISTS created_by uuid;

CREATE INDEX IF NOT EXISTS idx_atm_agency_status ON public.agency_team_members(agency_id, status);
CREATE INDEX IF NOT EXISTS idx_atm_auth_user ON public.agency_team_members(auth_user_id);

-- ============================================================
-- 3. Perfis de acesso (RBAC templates)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_access_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid,                     -- NULL = perfil nativo global
  key text NOT NULL,
  name text NOT NULL,
  description text,
  is_native boolean NOT NULL DEFAULT false,
  permission_keys text[] NOT NULL DEFAULT '{}',
  scopes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_profile_native ON public.agency_access_profiles(key) WHERE agency_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_access_profile_agency ON public.agency_access_profiles(agency_id, key) WHERE agency_id IS NOT NULL;

GRANT SELECT ON public.agency_access_profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.agency_access_profiles TO authenticated;
GRANT ALL ON public.agency_access_profiles TO service_role;
ALTER TABLE public.agency_access_profiles ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.agency_team_members
  ADD CONSTRAINT agency_team_members_access_profile_fkey
  FOREIGN KEY (access_profile_id) REFERENCES public.agency_access_profiles(id) ON DELETE SET NULL;

-- ============================================================
-- 4. Convites
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_team_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  email text NOT NULL,
  full_name text,
  role_title text,
  department text,
  team_name text,
  access_profile_id uuid REFERENCES public.agency_access_profiles(id) ON DELETE SET NULL,
  permission_keys text[] NOT NULL DEFAULT '{}',
  scopes jsonb NOT NULL DEFAULT '{}'::jsonb,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  member_id uuid,
  invited_by uuid NOT NULL,
  sent_count integer NOT NULL DEFAULT 1,
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_invite_token ON public.agency_team_invites(token_hash);
CREATE INDEX IF NOT EXISTS idx_team_invite_agency ON public.agency_team_invites(agency_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_team_invite_open
  ON public.agency_team_invites(agency_id, lower(email))
  WHERE accepted_at IS NULL AND revoked_at IS NULL;

GRANT SELECT ON public.agency_team_invites TO authenticated;
GRANT ALL ON public.agency_team_invites TO service_role;
ALTER TABLE public.agency_team_invites ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Escopos de dados por módulo
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_team_scopes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  team_member_id uuid NOT NULL REFERENCES public.agency_team_members(id) ON DELETE CASCADE,
  module_key text NOT NULL,
  scope public.team_data_scope NOT NULL DEFAULT 'own',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_member_id, module_key)
);
GRANT SELECT ON public.agency_team_scopes TO authenticated;
GRANT ALL ON public.agency_team_scopes TO service_role;
ALTER TABLE public.agency_team_scopes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 6. Configurações de comunidade/chat por agência
-- ============================================================
CREATE TABLE IF NOT EXISTS public.agency_community_settings (
  agency_id uuid PRIMARY KEY,
  public_community_enabled boolean NOT NULL DEFAULT true,
  internal_community_enabled boolean NOT NULL DEFAULT true,
  online_users_enabled boolean NOT NULL DEFAULT true,
  internal_chat_enabled boolean NOT NULL DEFAULT true,
  external_chat_enabled boolean NOT NULL DEFAULT true,
  preset text NOT NULL DEFAULT 'full',
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agency_community_settings TO authenticated;
GRANT ALL ON public.agency_community_settings TO service_role;
ALTER TABLE public.agency_community_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 7. Limites por plano
-- ============================================================
CREATE TABLE IF NOT EXISTS public.plan_team_limits (
  plan public.subscription_plan PRIMARY KEY,
  max_members integer NOT NULL DEFAULT 3,
  owner_counts boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.plan_team_limits TO authenticated;
GRANT ALL ON public.plan_team_limits TO service_role;
ALTER TABLE public.plan_team_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can read plan limits" ON public.plan_team_limits FOR SELECT TO authenticated USING (true);

INSERT INTO public.plan_team_limits (plan, max_members) VALUES
  ('start', 1), ('essencial', 2), ('profissional', 3), ('premium', 10),
  ('fundador', 10), ('educa_pass', 1), ('cartao_digital', 1), ('fornecedor_parceiro', 3)
ON CONFLICT (plan) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.agency_team_limit_overrides (
  agency_id uuid PRIMARY KEY,
  max_members integer NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agency_team_limit_overrides TO authenticated;
GRANT ALL ON public.agency_team_limit_overrides TO service_role;
ALTER TABLE public.agency_team_limit_overrides ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 8. Auditoria enriquecida
-- ============================================================
ALTER TABLE public.agency_team_audit_log
  ADD COLUMN IF NOT EXISTS actor_user_id uuid,
  ADD COLUMN IF NOT EXISTS module_key text,
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id text;
CREATE INDEX IF NOT EXISTS idx_audit_agency_created ON public.agency_team_audit_log(agency_id, created_at DESC);

-- ============================================================
-- 9. Atribuição/responsável em clientes (aditivo)
-- ============================================================
ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS created_by_team_member_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_team_member_id uuid;
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS created_by_team_member_id uuid;
ALTER TABLE public.operations
  ADD COLUMN IF NOT EXISTS created_by_team_member_id uuid,
  ADD COLUMN IF NOT EXISTS assigned_team_member_id uuid;

-- ============================================================
-- 10. Comunidade interna: agência + visibilidade
-- ============================================================
ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS agency_id uuid,
  ADD COLUMN IF NOT EXISTS visibility text NOT NULL DEFAULT 'public';
CREATE INDEX IF NOT EXISTS idx_community_posts_agency ON public.community_posts(agency_id, visibility);

-- ============================================================
-- 11. Funções auxiliares (SECURITY DEFINER)
-- ============================================================
CREATE OR REPLACE FUNCTION public.team_member_row(_uid uuid)
RETURNS TABLE (id uuid, agency_id uuid, department text, team_name text, status public.team_member_status)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.agency_id, m.department, m.team_name, m.status
  FROM public.agency_team_members m
  WHERE m.auth_user_id = _uid
  LIMIT 1
$$;

-- Agência efetiva de um usuário: subusuário -> agency_id; master -> ele mesmo
CREATE OR REPLACE FUNCTION public.user_agency_id(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(
    (SELECT m.agency_id FROM public.agency_team_members m WHERE m.auth_user_id = _uid LIMIT 1),
    _uid
  )
$$;

CREATE OR REPLACE FUNCTION public.is_team_subuser(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agency_team_members m WHERE m.auth_user_id = _uid)
$$;

-- Escopo efetivo do usuário atual para um módulo ('agency' para masters)
CREATE OR REPLACE FUNCTION public.team_scope_for(_module text)
RETURNS public.team_data_scope LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN NOT public.is_team_subuser(auth.uid()) THEN 'agency'::public.team_data_scope
    ELSE COALESCE(
      (SELECT s.scope FROM public.agency_team_scopes s
       JOIN public.agency_team_members m ON m.id = s.team_member_id
       WHERE m.auth_user_id = auth.uid() AND s.module_key = _module LIMIT 1),
      'agency'::public.team_data_scope
    )
  END
$$;

-- Um registro é visível para o usuário atual dado o escopo do módulo?
CREATE OR REPLACE FUNCTION public.team_record_visible(
  _module text, _created_by uuid, _assigned_to uuid
) RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _scope public.team_data_scope;
  _me uuid;
  _dept text;
  _team text;
BEGIN
  IF auth.uid() IS NULL THEN RETURN true; END IF;
  SELECT id, department, team_name INTO _me, _dept, _team
  FROM public.agency_team_members WHERE auth_user_id = auth.uid() LIMIT 1;
  IF _me IS NULL THEN RETURN true; END IF;  -- master/proprietário vê tudo

  _scope := public.team_scope_for(_module);
  IF _scope = 'agency' THEN RETURN true; END IF;
  IF _scope = 'own' THEN RETURN _created_by = _me OR _assigned_to = _me; END IF;
  IF _scope = 'created' THEN RETURN _created_by = _me; END IF;
  IF _scope = 'assigned' THEN RETURN _assigned_to = _me; END IF;
  IF _scope = 'team' THEN
    RETURN _created_by = _me OR _assigned_to = _me OR EXISTS (
      SELECT 1 FROM public.agency_team_members o
      WHERE o.id IN (_created_by, _assigned_to)
        AND _team IS NOT NULL AND o.team_name = _team
    );
  END IF;
  IF _scope = 'department' THEN
    RETURN _created_by = _me OR _assigned_to = _me OR EXISTS (
      SELECT 1 FROM public.agency_team_members o
      WHERE o.id IN (_created_by, _assigned_to)
        AND _dept IS NOT NULL AND o.department = _dept
    );
  END IF;
  RETURN true;
END $$;

-- Configurações de comunidade com defaults
CREATE OR REPLACE FUNCTION public.agency_community_flags(_agency uuid)
RETURNS TABLE (
  public_community_enabled boolean, internal_community_enabled boolean,
  online_users_enabled boolean, internal_chat_enabled boolean, external_chat_enabled boolean
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    COALESCE(s.public_community_enabled, true),
    COALESCE(s.internal_community_enabled, true),
    COALESCE(s.online_users_enabled, true),
    COALESCE(s.internal_chat_enabled, true),
    COALESCE(s.external_chat_enabled, true)
  FROM (SELECT _agency AS a) x
  LEFT JOIN public.agency_community_settings s ON s.agency_id = x.a
$$;

-- Pode o usuário atual ver conteúdo público entre agências?
CREATE OR REPLACE FUNCTION public.can_use_public_community()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT f.public_community_enabled
    FROM public.agency_community_flags(public.user_agency_id(auth.uid())) f), true)
$$;

CREATE OR REPLACE FUNCTION public.can_chat_externally(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT f.external_chat_enabled
    FROM public.agency_community_flags(public.user_agency_id(_uid)) f), true)
$$;

-- Visibilidade de presença/perfil de outro usuário
CREATE OR REPLACE FUNCTION public.can_see_agency_user(_target uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _mine uuid; _theirs uuid; _online boolean; _pub boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  IF _target = auth.uid() THEN RETURN true; END IF;
  _mine := public.user_agency_id(auth.uid());
  _theirs := public.user_agency_id(_target);
  SELECT f.online_users_enabled, f.public_community_enabled INTO _online, _pub
  FROM public.agency_community_flags(_mine) f;
  IF _mine = _theirs THEN RETURN COALESCE(_online, true); END IF;
  RETURN COALESCE(_pub, true)
     AND COALESCE((SELECT g.public_community_enabled FROM public.agency_community_flags(_theirs) g), true);
END $$;

-- ============================================================
-- 12. RLS das novas tabelas
-- ============================================================
CREATE POLICY "Native profiles readable by authenticated" ON public.agency_access_profiles
  FOR SELECT TO authenticated USING (agency_id IS NULL OR agency_id = public.user_agency_id(auth.uid()));
CREATE POLICY "Owner manages own agency profiles" ON public.agency_access_profiles
  FOR ALL TO authenticated
  USING (agency_id IS NOT NULL AND agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid()))
  WITH CHECK (agency_id IS NOT NULL AND agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid()) AND is_native = false);

CREATE POLICY "Owner reads own agency invites" ON public.agency_team_invites
  FOR SELECT TO authenticated USING (agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid()));

CREATE POLICY "Agency reads own scopes" ON public.agency_team_scopes
  FOR SELECT TO authenticated
  USING (agency_id = public.user_agency_id(auth.uid()));

CREATE POLICY "Agency reads community settings" ON public.agency_community_settings
  FOR SELECT TO authenticated USING (agency_id = public.user_agency_id(auth.uid()));
CREATE POLICY "Owner manages community settings" ON public.agency_community_settings
  FOR ALL TO authenticated
  USING (agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid()))
  WITH CHECK (agency_id = auth.uid() AND NOT public.is_team_subuser(auth.uid()));

CREATE POLICY "Agency reads own limit override" ON public.agency_team_limit_overrides
  FOR SELECT TO authenticated USING (agency_id = public.user_agency_id(auth.uid()));

-- ============================================================
-- 13. RLS RESTRICTIVE de escopo (masters não são afetados)
-- ============================================================
CREATE POLICY "team_scope_clients" ON public.clients AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.team_record_visible('clients', created_by_team_member_id, assigned_team_member_id));
CREATE POLICY "team_scope_opportunities" ON public.opportunities AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id));
CREATE POLICY "team_scope_operations" ON public.operations AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.team_record_visible('operations', created_by_team_member_id, assigned_team_member_id));

-- ============================================================
-- 14. RLS RESTRICTIVE de comunidade / presença / chat
-- ============================================================
CREATE POLICY "community_posts_visibility" ON public.community_posts AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (visibility = 'internal' AND agency_id IS NOT NULL AND agency_id = public.user_agency_id(auth.uid()))
    OR (visibility <> 'internal' AND public.can_use_public_community()
        AND COALESCE((SELECT f.public_community_enabled
             FROM public.agency_community_flags(public.user_agency_id(user_id)) f), true))
  );

CREATE POLICY "presence_visibility" ON public.user_presence AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_see_agency_user(user_id));

CREATE POLICY "dm_conversation_scope" ON public.direct_conversations AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    public.user_agency_id(user_a) = public.user_agency_id(user_b)
    OR (public.can_chat_externally(user_a) AND public.can_chat_externally(user_b))
  );

-- ============================================================
-- 15. Seed de perfis nativos
-- ============================================================
INSERT INTO public.agency_access_profiles (agency_id, key, name, description, is_native, permission_keys, scopes) VALUES
(NULL, 'owner', 'Proprietário', 'Acesso total à agência, equipe, financeiro e configurações.', true,
 ARRAY['*'], '{"clients":"agency","opportunities":"agency","operations":"agency","quotes":"agency","itineraries":"agency","wallet":"agency","financial":"agency","agenda":"agency","tasks":"agency"}'::jsonb),
(NULL, 'admin', 'Administrador', 'Gestão completa exceto transferência de propriedade.', true,
 ARRAY['dashboard.view','clients.view','clients.create','clients.edit','clients.delete','clients.export','clients.assign','opportunities.view','opportunities.create','opportunities.edit','opportunities.delete','opportunities.assign','opportunities.generate_quote','opportunities.generate_wallet','operations.view','operations.create','operations.edit','operations.delete','operations.assign','sales.view','sales.create','sales.edit','sales.delete','sales.export','quotes.view','quotes.create','quotes.edit','quotes.delete','quotes.duplicate','quotes.share','itineraries.view','itineraries.create','itineraries.edit','itineraries.delete','itineraries.duplicate','itineraries.share','wallet.view','wallet.create','wallet.edit','wallet.delete','wallet.share','agenda.view','agenda.create','agenda.edit','agenda.delete','tasks.view','tasks.create','tasks.edit','tasks.delete','tasks.assign','trips.view','financial.access','financial.view_revenue','financial.view_margin','financial.income.view','financial.income.manage','financial.expenses.view','financial.expenses.manage','financial.invoices.view','financial.invoices.manage','financial.commissions.view','financial.commissions.manage','financial.sellers.manage','financial.reports.view','financial.export','financial.settings','marketing.sales_pages.view','marketing.sales_pages.manage','marketing.lead_form.view','marketing.lead_form.manage','marketing.business_card.view','marketing.business_card.manage','marketing.showcase.view','marketing.showcase.manage','marketing.captions.view','marketing.slides.view','marketing.materials.view','marketing.air_blocks.view','academy.view','courses.view','mentorships.view','community.public.view','community.internal.view','community.post','community.qa.view','community.news.view','directory.view','advisor.view','hotel_xray.view','travel_requirements.view','benefits.view','chat.internal','chat.external','online_users.view','ai.use','notes.view','calculator.view','gamification.view','support.view','settings.view','settings.edit','account.view','subscription.view','integrations.manage','team.manage','audit.view'],
 '{"clients":"agency","opportunities":"agency","operations":"agency","quotes":"agency","itineraries":"agency","wallet":"agency","financial":"agency","agenda":"agency","tasks":"agency"}'::jsonb),
(NULL, 'manager', 'Gerente', 'Gestão da equipe e dos registros do departamento, com visão financeira parcial.', true,
 ARRAY['dashboard.view','clients.view','clients.create','clients.edit','clients.export','clients.assign','opportunities.view','opportunities.create','opportunities.edit','opportunities.assign','opportunities.generate_quote','opportunities.generate_wallet','operations.view','operations.create','operations.edit','operations.assign','sales.view','sales.create','sales.edit','sales.export','quotes.view','quotes.create','quotes.edit','quotes.duplicate','quotes.share','itineraries.view','itineraries.create','itineraries.edit','itineraries.duplicate','itineraries.share','wallet.view','wallet.create','wallet.edit','wallet.share','agenda.view','agenda.create','agenda.edit','tasks.view','tasks.create','tasks.edit','tasks.assign','trips.view','financial.access','financial.commissions.view','financial.reports.view','marketing.sales_pages.view','marketing.lead_form.view','marketing.business_card.view','marketing.showcase.view','marketing.captions.view','marketing.slides.view','marketing.materials.view','marketing.air_blocks.view','academy.view','courses.view','community.internal.view','community.post','community.qa.view','community.news.view','directory.view','advisor.view','hotel_xray.view','travel_requirements.view','benefits.view','chat.internal','online_users.view','ai.use','notes.view','calculator.view','support.view','account.view','audit.view'],
 '{"clients":"department","opportunities":"department","operations":"department","quotes":"department","itineraries":"department","wallet":"department","agenda":"department","tasks":"department"}'::jsonb),
(NULL, 'sales_manager', 'Gerente Comercial', 'Comanda o time comercial e acompanha comissões da equipe.', true,
 ARRAY['dashboard.view','clients.view','clients.create','clients.edit','clients.assign','clients.export','opportunities.view','opportunities.create','opportunities.edit','opportunities.assign','opportunities.generate_quote','opportunities.generate_wallet','operations.view','operations.create','operations.edit','sales.view','sales.create','sales.edit','sales.export','quotes.view','quotes.create','quotes.edit','quotes.duplicate','quotes.share','itineraries.view','itineraries.create','itineraries.edit','itineraries.share','wallet.view','wallet.create','wallet.edit','wallet.share','agenda.view','agenda.create','agenda.edit','tasks.view','tasks.create','tasks.edit','tasks.assign','trips.view','financial.access','financial.commissions.view','financial.reports.view','marketing.sales_pages.view','marketing.lead_form.view','marketing.business_card.view','marketing.showcase.view','marketing.captions.view','marketing.materials.view','marketing.air_blocks.view','academy.view','community.internal.view','community.post','community.qa.view','community.news.view','directory.view','advisor.view','hotel_xray.view','travel_requirements.view','benefits.view','chat.internal','online_users.view','ai.use','notes.view','calculator.view','support.view','account.view'],
 '{"clients":"team","opportunities":"team","operations":"team","quotes":"team","itineraries":"team","wallet":"team","agenda":"team","tasks":"team"}'::jsonb),
(NULL, 'travel_consultant', 'Consultor de Viagens', 'Atende os próprios clientes e vendas, sem acesso ao financeiro geral.', true,
 ARRAY['dashboard.view','clients.view','clients.create','clients.edit','opportunities.view','opportunities.create','opportunities.edit','opportunities.generate_quote','opportunities.generate_wallet','operations.view','operations.create','operations.edit','sales.view','sales.create','quotes.view','quotes.create','quotes.edit','quotes.duplicate','quotes.share','itineraries.view','itineraries.create','itineraries.edit','itineraries.duplicate','itineraries.share','wallet.view','wallet.create','wallet.edit','wallet.share','agenda.view','agenda.create','agenda.edit','tasks.view','tasks.create','tasks.edit','trips.view','financial.commissions.view','marketing.business_card.view','marketing.captions.view','marketing.materials.view','marketing.air_blocks.view','academy.view','courses.view','community.internal.view','community.post','community.qa.view','community.news.view','directory.view','advisor.view','hotel_xray.view','travel_requirements.view','benefits.view','chat.internal','online_users.view','ai.use','notes.view','calculator.view','support.view','account.view'],
 '{"clients":"own","opportunities":"own","operations":"own","quotes":"own","itineraries":"own","wallet":"own","agenda":"own","tasks":"own","financial":"own"}'::jsonb),
(NULL, 'seller', 'Vendedor', 'Foco em oportunidades e orçamentos próprios.', true,
 ARRAY['dashboard.view','clients.view','clients.create','clients.edit','opportunities.view','opportunities.create','opportunities.edit','opportunities.generate_quote','sales.view','quotes.view','quotes.create','quotes.edit','quotes.share','wallet.view','wallet.create','agenda.view','agenda.create','tasks.view','tasks.create','tasks.edit','trips.view','financial.commissions.view','marketing.business_card.view','marketing.captions.view','marketing.materials.view','academy.view','community.internal.view','community.post','community.news.view','directory.view','chat.internal','online_users.view','ai.use','notes.view','calculator.view','support.view','account.view'],
 '{"clients":"own","opportunities":"own","operations":"own","quotes":"own","itineraries":"own","wallet":"own","agenda":"own","tasks":"own","financial":"own"}'::jsonb),
(NULL, 'finance', 'Financeiro', 'Acesso exclusivo aos módulos financeiros da agência.', true,
 ARRAY['dashboard.view','financial.access','financial.view_revenue','financial.view_margin','financial.income.view','financial.income.manage','financial.expenses.view','financial.expenses.manage','financial.invoices.view','financial.invoices.manage','financial.commissions.view','financial.commissions.manage','financial.sellers.manage','financial.reports.view','financial.export','financial.settings','financial.approve_payments','financial.reconcile','financial.bank_data.view','notes.view','calculator.view','support.view','account.view','community.internal.view','chat.internal','online_users.view'],
 '{"financial":"agency"}'::jsonb),
(NULL, 'operations', 'Operacional', 'Executa operações, emissões e documentos das viagens.', true,
 ARRAY['dashboard.view','clients.view','clients.edit','opportunities.view','operations.view','operations.create','operations.edit','operations.assign','quotes.view','itineraries.view','itineraries.create','itineraries.edit','wallet.view','wallet.create','wallet.edit','wallet.share','agenda.view','agenda.create','agenda.edit','tasks.view','tasks.create','tasks.edit','trips.view','marketing.air_blocks.view','marketing.materials.view','academy.view','community.internal.view','community.post','community.news.view','directory.view','travel_requirements.view','chat.internal','online_users.view','ai.use','notes.view','calculator.view','support.view','account.view'],
 '{"clients":"agency","opportunities":"agency","operations":"agency","quotes":"agency","itineraries":"agency","wallet":"agency","agenda":"agency","tasks":"agency"}'::jsonb),
(NULL, 'marketing', 'Marketing', 'Cuida das páginas de vendas, materiais e conteúdo.', true,
 ARRAY['dashboard.view','marketing.sales_pages.view','marketing.sales_pages.manage','marketing.lead_form.view','marketing.lead_form.manage','marketing.business_card.view','marketing.business_card.manage','marketing.showcase.view','marketing.showcase.manage','marketing.captions.view','marketing.slides.view','marketing.materials.view','marketing.air_blocks.view','academy.view','courses.view','community.internal.view','community.post','community.qa.view','community.news.view','directory.view','chat.internal','online_users.view','ai.use','notes.view','support.view','account.view'],
 '{}'::jsonb),
(NULL, 'support', 'Atendimento', 'Atende clientes e registra interações, sem acesso financeiro.', true,
 ARRAY['dashboard.view','clients.view','clients.create','clients.edit','opportunities.view','opportunities.create','opportunities.edit','operations.view','quotes.view','itineraries.view','wallet.view','agenda.view','agenda.create','agenda.edit','tasks.view','tasks.create','tasks.edit','trips.view','academy.view','community.internal.view','community.post','community.news.view','directory.view','travel_requirements.view','chat.internal','online_users.view','ai.use','notes.view','calculator.view','support.view','account.view'],
 '{"clients":"agency","opportunities":"assigned","operations":"assigned","quotes":"agency","itineraries":"agency","wallet":"agency","agenda":"agency","tasks":"own"}'::jsonb),
(NULL, 'read_only', 'Somente Leitura', 'Apenas visualização, sem criar, editar ou excluir.', true,
 ARRAY['dashboard.view','clients.view','opportunities.view','operations.view','sales.view','quotes.view','itineraries.view','wallet.view','agenda.view','tasks.view','trips.view','academy.view','community.internal.view','community.news.view','directory.view','benefits.view','online_users.view','notes.view','account.view'],
 '{"clients":"agency","opportunities":"agency","operations":"agency","quotes":"agency","itineraries":"agency","wallet":"agency","agenda":"agency","tasks":"agency"}'::jsonb)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 16. Trigger updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

DROP TRIGGER IF EXISTS trg_access_profiles_touch ON public.agency_access_profiles;
CREATE TRIGGER trg_access_profiles_touch BEFORE UPDATE ON public.agency_access_profiles
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_team_scopes_touch ON public.agency_team_scopes;
CREATE TRIGGER trg_team_scopes_touch BEFORE UPDATE ON public.agency_team_scopes
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
DROP TRIGGER IF EXISTS trg_community_settings_touch ON public.agency_community_settings;
CREATE TRIGGER trg_community_settings_touch BEFORE UPDATE ON public.agency_community_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();