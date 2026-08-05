-- ============================================================
-- 1. CATÁLOGO CANÔNICO DE PERMISSÕES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.team_permission_catalog (
  permission_key text PRIMARY KEY,
  module_key text NOT NULL,
  label text NOT NULL,
  is_sensitive boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.team_permission_catalog TO authenticated;
GRANT ALL ON public.team_permission_catalog TO service_role;
ALTER TABLE public.team_permission_catalog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Catalog readable by authenticated" ON public.team_permission_catalog;
CREATE POLICY "Catalog readable by authenticated"
  ON public.team_permission_catalog FOR SELECT TO authenticated USING (true);

INSERT INTO public.team_permission_catalog (permission_key, module_key, label, is_sensitive) VALUES
('dashboard.view','dashboard','Visualizar a página inicial',false),
('clients.view','clients','Visualizar clientes',false),
('clients.create','clients','Cadastrar clientes',false),
('clients.edit','clients','Editar clientes',false),
('clients.delete','clients','Excluir clientes',true),
('clients.export','clients','Exportar lista de clientes',true),
('clients.assign','clients','Definir responsável pelo cliente',false),
('goals.view','clients','Visualizar metas',false),
('goals.edit','clients','Editar metas',false),
('opportunities.view','opportunities','Visualizar oportunidades',false),
('opportunities.create','opportunities','Criar oportunidades',false),
('opportunities.edit','opportunities','Editar oportunidades',false),
('opportunities.delete','opportunities','Excluir oportunidades',true),
('opportunities.assign','opportunities','Definir responsável',false),
('opportunities.generate_quote','opportunities','Gerar orçamento a partir da oportunidade',false),
('opportunities.generate_wallet','opportunities','Gerar carteira digital',false),
('operations.view','operations','Visualizar operações',false),
('operations.create','operations','Criar operações',false),
('operations.edit','operations','Editar operações',false),
('operations.delete','operations','Excluir operações',true),
('operations.assign','operations','Definir responsável pela operação',false),
('sales.view','sales','Visualizar vendas',false),
('sales.create','sales','Registrar vendas',false),
('sales.edit','sales','Editar vendas',false),
('sales.delete','sales','Excluir vendas',true),
('sales.export','sales','Exportar vendas',true),
('quotes.view','quotes','Visualizar orçamentos',false),
('quotes.create','quotes','Criar orçamentos',false),
('quotes.edit','quotes','Editar orçamentos',false),
('quotes.delete','quotes','Excluir orçamentos',true),
('quotes.duplicate','quotes','Duplicar orçamentos',false),
('quotes.share','quotes','Compartilhar link público',false),
('itineraries.view','itineraries','Visualizar roteiros',false),
('itineraries.create','itineraries','Criar roteiros',false),
('itineraries.edit','itineraries','Editar roteiros',false),
('itineraries.delete','itineraries','Excluir roteiros',true),
('itineraries.duplicate','itineraries','Duplicar roteiros',false),
('itineraries.share','itineraries','Compartilhar link público',false),
('wallet.view','wallet','Visualizar carteiras',false),
('wallet.create','wallet','Criar carteiras',false),
('wallet.edit','wallet','Editar carteiras',false),
('wallet.delete','wallet','Excluir carteiras',true),
('wallet.share','wallet','Compartilhar link público',false),
('agenda.view','agenda','Visualizar agenda',false),
('agenda.create','agenda','Criar compromissos',false),
('agenda.edit','agenda','Editar compromissos',false),
('agenda.delete','agenda','Excluir compromissos',false),
('tasks.view','agenda','Visualizar tarefas',false),
('tasks.create','agenda','Criar tarefas',false),
('tasks.edit','agenda','Editar tarefas',false),
('tasks.delete','agenda','Excluir tarefas',false),
('tasks.assign','agenda','Atribuir tarefas a outros',false),
('trips.view','agenda','Visualizar próximas viagens',false),
('financial.access','financial','Acessar o módulo financeiro',false),
('financial.view_revenue','financial','Ver faturamento',true),
('financial.view_margin','financial','Ver margem e lucro',true),
('financial.income.view','financial','Ver entradas',false),
('financial.income.manage','financial','Lançar e editar entradas',false),
('financial.expenses.view','financial','Ver despesas',false),
('financial.expenses.manage','financial','Lançar e editar despesas',false),
('financial.invoices.view','financial','Ver faturas',false),
('financial.invoices.manage','financial','Emitir e editar faturas',false),
('financial.commissions.view','financial','Ver comissões',false),
('financial.commissions.manage','financial','Gerenciar comissões',true),
('financial.sellers.manage','financial','Gerenciar vendedores e regras',true),
('financial.reports.view','financial','Ver relatórios financeiros',false),
('financial.export','financial','Exportar dados financeiros',true),
('financial.settings','financial','Configurações financeiras',true),
('marketing.sales_pages.view','marketing','Ver páginas de vendas',false),
('marketing.sales_pages.manage','marketing','Criar e editar páginas de vendas',false),
('marketing.lead_form.view','marketing','Ver formulário conversacional',false),
('marketing.lead_form.manage','marketing','Configurar formulário conversacional',false),
('marketing.business_card.view','marketing','Ver cartão digital',false),
('marketing.business_card.manage','marketing','Editar cartão digital',false),
('marketing.showcase.view','marketing','Ver vitrine',false),
('marketing.showcase.manage','marketing','Gerenciar vitrine',false),
('marketing.captions.view','marketing','Legendas e conteúdos',false),
('marketing.slides.view','marketing','Apresentações',false),
('marketing.materials.view','marketing','Materiais de divulgação',false),
('marketing.air_blocks.view','marketing','Bloqueios aéreos',false),
('academy.view','education','EducaTravel Academy',false),
('courses.view','education','Cursos',false),
('mentorships.view','education','Mentorias',false),
('community.public.view','community','Comunidade pública (entre agências)',false),
('community.internal.view','community','Comunidade interna da agência',false),
('community.post','community','Publicar e comentar',false),
('community.qa.view','community','Perguntas e respostas',false),
('community.news.view','community','Radar do Turismo / notícias',false),
('chat.internal','community','Conversar com colegas da agência',false),
('chat.external','community','Conversar com agentes de outras agências',false),
('online_users.view','community','Ver usuários online',false),
('directory.view','tools','Mapa do Turismo / fornecedores',false),
('advisor.view','tools','Consultores de destino',false),
('hotel_xray.view','tools','Hotel Raio-X',false),
('travel_requirements.view','tools','Requisitos de viagem',false),
('benefits.view','tools','Benefícios e descontos',false),
('ai.use','tools','Usar recursos de inteligência artificial',false),
('notes.view','tools','Bloco de notas',false),
('calculator.view','tools','Calculadora',false),
('gamification.view','tools','Ranking e gamificação',false),
('support.view','tools','Abrir chamados de suporte',false),
('settings.view','settings','Ver configurações',false),
('settings.edit','settings','Editar configurações',true),
('account.view','settings','Ver dados da conta',false),
('subscription.view','settings','Ver assinatura e plano',true),
('integrations.manage','settings','Gerenciar integrações',true),
('team.manage','settings','Gerenciar equipe e permissões',true),
('audit.view','settings','Ver histórico de auditoria',true)
ON CONFLICT (permission_key) DO UPDATE
  SET module_key = EXCLUDED.module_key, label = EXCLUDED.label, is_sensitive = EXCLUDED.is_sensitive;

-- Remove chaves órfãs (sem funcionalidade real) dos perfis nativos
UPDATE public.agency_access_profiles p
SET permission_keys = (
  SELECT COALESCE(array_agg(k ORDER BY k), '{}')
  FROM unnest(p.permission_keys) k
  WHERE k = '*' OR EXISTS (SELECT 1 FROM public.team_permission_catalog c WHERE c.permission_key = k)
)
WHERE EXISTS (
  SELECT 1 FROM unnest(p.permission_keys) k
  WHERE k <> '*' AND NOT EXISTS (SELECT 1 FROM public.team_permission_catalog c WHERE c.permission_key = k)
);

CREATE OR REPLACE FUNCTION public.team_valid_permission_keys(_keys text[])
RETURNS text[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(array_agg(DISTINCT k ORDER BY k), '{}')
  FROM unnest(COALESCE(_keys, '{}'::text[])) k
  WHERE EXISTS (SELECT 1 FROM public.team_permission_catalog c WHERE c.permission_key = k)
$$;
REVOKE EXECUTE ON FUNCTION public.team_valid_permission_keys(text[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_valid_permission_keys(text[]) TO authenticated, service_role;

-- ============================================================
-- 2. HELPERS DE PERMISSÃO / ESCOPO FAIL-CLOSED
-- ============================================================
CREATE OR REPLACE FUNCTION public.team_self_member_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id FROM public.agency_team_members m
  WHERE m.auth_user_id = auth.uid() LIMIT 1
$$;
REVOKE EXECUTE ON FUNCTION public.team_self_member_id() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_self_member_id() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_team(_key text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _status public.team_member_status;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT m.id, m.status INTO _id, _status FROM public.agency_team_members m
  WHERE m.auth_user_id = auth.uid() LIMIT 1;
  IF _id IS NULL THEN RETURN true; END IF;              -- proprietário/master
  IF _status <> 'active' THEN RETURN false; END IF;      -- bloqueado/desativado
  RETURN EXISTS (
    SELECT 1 FROM public.agency_team_permissions p
    WHERE p.team_member_id = _id AND p.permission_key = _key AND p.enabled
  );
END $$;
REVOKE EXECUTE ON FUNCTION public.can_team(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_team(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_can_manage_team()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.can_team('team.manage')
$$;
REVOKE EXECUTE ON FUNCTION public.team_can_manage_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_can_manage_team() TO authenticated, service_role;

-- Escopo: fallback 'own' para colaborador sem configuração explícita
CREATE OR REPLACE FUNCTION public.team_scope_for(_module text)
RETURNS public.team_data_scope LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT CASE
    WHEN auth.uid() IS NULL THEN 'own'::public.team_data_scope
    WHEN NOT public.is_team_subuser(auth.uid()) THEN 'agency'::public.team_data_scope
    ELSE COALESCE(
      (SELECT s.scope FROM public.agency_team_scopes s
       JOIN public.agency_team_members m ON m.id = s.team_member_id
       WHERE m.auth_user_id = auth.uid() AND s.module_key = _module LIMIT 1),
      'own'::public.team_data_scope
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.team_record_visible(_module text, _created_by uuid, _assigned_to uuid)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _scope public.team_data_scope; _me uuid; _dept text; _team text; _status public.team_member_status;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT id, department, team_name, status INTO _me, _dept, _team, _status
  FROM public.agency_team_members WHERE auth_user_id = auth.uid() LIMIT 1;
  IF _me IS NULL THEN RETURN true; END IF;               -- proprietário
  IF _status <> 'active' THEN RETURN false; END IF;

  _scope := public.team_scope_for(_module);
  IF _scope = 'agency' THEN RETURN true; END IF;
  IF _scope = 'own' THEN RETURN _created_by = _me OR _assigned_to = _me; END IF;
  IF _scope = 'created' THEN RETURN _created_by = _me; END IF;
  IF _scope = 'assigned' THEN RETURN _assigned_to = _me; END IF;
  IF _scope = 'team' THEN
    RETURN _created_by = _me OR _assigned_to = _me OR EXISTS (
      SELECT 1 FROM public.agency_team_members o
      WHERE o.id IN (_created_by, _assigned_to) AND _team IS NOT NULL AND o.team_name = _team);
  END IF;
  IF _scope = 'department' THEN
    RETURN _created_by = _me OR _assigned_to = _me OR EXISTS (
      SELECT 1 FROM public.agency_team_members o
      WHERE o.id IN (_created_by, _assigned_to) AND _dept IS NOT NULL AND o.department = _dept);
  END IF;
  RETURN false;
END $$;

-- ============================================================
-- 3. COMUNIDADE, CHAT E PRESENÇA
-- ============================================================
CREATE OR REPLACE FUNCTION public.can_use_internal_community()
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _on boolean;
BEGIN
  IF auth.uid() IS NULL THEN RETURN false; END IF;
  SELECT f.internal_community_enabled INTO _on
  FROM public.agency_community_flags(public.user_agency_id(auth.uid())) f;
  RETURN COALESCE(_on, true) AND public.can_team('community.internal.view');
END $$;
REVOKE EXECUTE ON FUNCTION public.can_use_internal_community() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_internal_community() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.can_chat_internally(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT f.internal_chat_enabled
    FROM public.agency_community_flags(public.user_agency_id(_uid)) f), true)
$$;
REVOKE EXECUTE ON FUNCTION public.can_chat_internally(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_chat_internally(uuid) TO authenticated, service_role;

-- Chat: interno exige internal_chat_enabled nas duas pontas (mesma agência),
-- externo exige external_chat_enabled nas duas agências.
DROP POLICY IF EXISTS dm_conversation_scope ON public.direct_conversations;
CREATE POLICY dm_conversation_scope ON public.direct_conversations
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (
    CASE WHEN public.user_agency_id(user_a) = public.user_agency_id(user_b)
      THEN public.can_chat_internally(user_a) AND public.can_chat_internally(user_b)
           AND public.can_team('chat.internal')
      ELSE public.can_chat_externally(user_a) AND public.can_chat_externally(user_b)
           AND public.can_team('chat.external')
    END
  )
  WITH CHECK (
    CASE WHEN public.user_agency_id(user_a) = public.user_agency_id(user_b)
      THEN public.can_chat_internally(user_a) AND public.can_chat_internally(user_b)
           AND public.can_team('chat.internal')
      ELSE public.can_chat_externally(user_a) AND public.can_chat_externally(user_b)
           AND public.can_team('chat.external')
    END
  );

DROP POLICY IF EXISTS dm_messages_scope ON public.direct_messages;
CREATE POLICY dm_messages_scope ON public.direct_messages
  AS RESTRICTIVE FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.direct_conversations c WHERE c.id = conversation_id))
  WITH CHECK (EXISTS (SELECT 1 FROM public.direct_conversations c WHERE c.id = conversation_id));

-- Mural: leitura interna exige comunidade interna ativa; escrita valida agência e visibilidade
DROP POLICY IF EXISTS community_posts_visibility ON public.community_posts;
CREATE POLICY community_posts_visibility ON public.community_posts
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR (
      visibility = 'internal'
      AND agency_id IS NOT NULL
      AND agency_id = public.user_agency_id(auth.uid())
      AND public.can_use_internal_community()
    )
    OR (
      visibility <> 'internal'
      AND public.can_use_public_community()
      AND public.can_team('community.public.view')
      AND COALESCE((SELECT f.public_community_enabled
        FROM public.agency_community_flags(public.user_agency_id(community_posts.user_id)) f), true)
    )
  );

DROP POLICY IF EXISTS community_posts_write_guard ON public.community_posts;
CREATE POLICY community_posts_write_guard ON public.community_posts
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND public.can_team('community.post')
    AND visibility IN ('public', 'internal')
    AND (
      (visibility = 'internal'
        AND agency_id IS NOT NULL
        AND agency_id = public.user_agency_id(auth.uid())
        AND public.can_use_internal_community())
      OR
      (visibility = 'public'
        AND public.can_use_public_community()
        AND (agency_id IS NULL OR agency_id = public.user_agency_id(auth.uid())))
    )
  );

DROP POLICY IF EXISTS community_posts_update_guard ON public.community_posts;
CREATE POLICY community_posts_update_guard ON public.community_posts
  AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND public.can_team('community.post'))
  WITH CHECK (
    user_id = auth.uid()
    AND visibility IN ('public', 'internal')
    AND (agency_id IS NULL OR agency_id = public.user_agency_id(auth.uid()))
    AND (visibility <> 'internal' OR public.can_use_internal_community())
    AND (visibility <> 'public' OR public.can_use_public_community())
  );

DROP POLICY IF EXISTS community_posts_delete_guard ON public.community_posts;
CREATE POLICY community_posts_delete_guard ON public.community_posts
  AS RESTRICTIVE FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::public.app_role));

DROP POLICY IF EXISTS community_comments_guard ON public.community_post_comments;
CREATE POLICY community_comments_guard ON public.community_post_comments
  AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.can_team('community.post'));

-- Presença online
DROP POLICY IF EXISTS presence_visibility ON public.user_presence;
CREATE POLICY presence_visibility ON public.user_presence
  AS RESTRICTIVE FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR (public.can_see_agency_user(user_id) AND public.can_team('online_users.view')));

-- ============================================================
-- 4. PERMISSÃO + ESCOPO + TENANT NOS MÓDULOS COM ATRIBUIÇÃO
-- ============================================================
DROP POLICY IF EXISTS team_scope_clients ON public.clients;
CREATE POLICY team_clients_select ON public.clients AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('clients.view')
    AND public.team_record_visible('clients', created_by_team_member_id, assigned_team_member_id));
CREATE POLICY team_clients_insert ON public.clients AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('clients.create')
    AND user_id = public.user_agency_id(auth.uid())
    AND (public.team_self_member_id() IS NULL OR created_by_team_member_id = public.team_self_member_id()));
CREATE POLICY team_clients_update ON public.clients AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('clients.edit')
    AND public.team_record_visible('clients', created_by_team_member_id, assigned_team_member_id))
  WITH CHECK (user_id = public.user_agency_id(auth.uid()));
CREATE POLICY team_clients_delete ON public.clients AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('clients.delete')
    AND public.team_record_visible('clients', created_by_team_member_id, assigned_team_member_id));

DROP POLICY IF EXISTS team_scope_opportunities ON public.opportunities;
CREATE POLICY team_opps_select ON public.opportunities AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('opportunities.view')
    AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id));
CREATE POLICY team_opps_insert ON public.opportunities AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('opportunities.create')
    AND user_id = public.user_agency_id(auth.uid())
    AND (public.team_self_member_id() IS NULL OR created_by_team_member_id = public.team_self_member_id()));
CREATE POLICY team_opps_update ON public.opportunities AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('opportunities.edit')
    AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id))
  WITH CHECK (user_id = public.user_agency_id(auth.uid()));
CREATE POLICY team_opps_delete ON public.opportunities AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('opportunities.delete')
    AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id));

DROP POLICY IF EXISTS team_scope_operations ON public.operations;
CREATE POLICY team_ops_select ON public.operations AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('operations.view')
    AND public.team_record_visible('operations', created_by_team_member_id, assigned_team_member_id));
CREATE POLICY team_ops_insert ON public.operations AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('operations.create')
    AND user_id = public.user_agency_id(auth.uid())
    AND (public.team_self_member_id() IS NULL OR created_by_team_member_id = public.team_self_member_id()));
CREATE POLICY team_ops_update ON public.operations AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('operations.edit')
    AND public.team_record_visible('operations', created_by_team_member_id, assigned_team_member_id))
  WITH CHECK (user_id = public.user_agency_id(auth.uid()));
CREATE POLICY team_ops_delete ON public.operations AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('operations.delete')
    AND public.team_record_visible('operations', created_by_team_member_id, assigned_team_member_id));

-- ── Módulos sem coluna de atribuição: permissão + tenant ────
CREATE POLICY team_quotes_select ON public.quotes AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('quotes.view'));
CREATE POLICY team_quotes_insert ON public.quotes AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('quotes.create'));
CREATE POLICY team_quotes_update ON public.quotes AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('quotes.edit'));
CREATE POLICY team_quotes_delete ON public.quotes AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('quotes.delete'));

CREATE POLICY team_itineraries_select ON public.itineraries AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('itineraries.view'));
CREATE POLICY team_itineraries_insert ON public.itineraries AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('itineraries.create'));
CREATE POLICY team_itineraries_update ON public.itineraries AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('itineraries.edit'));
CREATE POLICY team_itineraries_delete ON public.itineraries AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('itineraries.delete'));

CREATE POLICY team_trips_select ON public.trips AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('wallet.view'));
CREATE POLICY team_trips_insert ON public.trips AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('wallet.create'));
CREATE POLICY team_trips_update ON public.trips AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('wallet.edit'));
CREATE POLICY team_trips_delete ON public.trips AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('wallet.delete'));

CREATE POLICY team_sales_select ON public.sales AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('sales.view'));
CREATE POLICY team_sales_insert ON public.sales AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('sales.create'));
CREATE POLICY team_sales_update ON public.sales AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('sales.edit'));
CREATE POLICY team_sales_delete ON public.sales AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('sales.delete'));

CREATE POLICY team_agenda_select ON public.agency_events AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('agenda.view'));
CREATE POLICY team_agenda_insert ON public.agency_events AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('agenda.create'));
CREATE POLICY team_agenda_update ON public.agency_events AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('agenda.edit'));
CREATE POLICY team_agenda_delete ON public.agency_events AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('agenda.delete'));

CREATE POLICY team_tasks_select ON public.operation_tasks AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('tasks.view'));
CREATE POLICY team_tasks_insert ON public.operation_tasks AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('tasks.create'));
CREATE POLICY team_tasks_update ON public.operation_tasks AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('tasks.edit'));
CREATE POLICY team_tasks_delete ON public.operation_tasks AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('tasks.delete'));

CREATE POLICY team_income_select ON public.income_entries AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('financial.access') AND public.can_team('financial.income.view'));
CREATE POLICY team_income_write ON public.income_entries AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('financial.income.manage'));
CREATE POLICY team_income_update ON public.income_entries AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('financial.income.manage'));
CREATE POLICY team_income_delete ON public.income_entries AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('financial.income.manage'));

CREATE POLICY team_expense_select ON public.expense_entries AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('financial.access') AND public.can_team('financial.expenses.view'));
CREATE POLICY team_expense_write ON public.expense_entries AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('financial.expenses.manage'));
CREATE POLICY team_expense_update ON public.expense_entries AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('financial.expenses.manage'));
CREATE POLICY team_expense_delete ON public.expense_entries AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('financial.expenses.manage'));

CREATE POLICY team_invoices_select ON public.invoices AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('financial.invoices.view'));
CREATE POLICY team_invoices_insert ON public.invoices AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('financial.invoices.manage'));
CREATE POLICY team_invoices_update ON public.invoices AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('financial.invoices.manage'));
CREATE POLICY team_invoices_delete ON public.invoices AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('financial.invoices.manage'));

CREATE POLICY team_goals_select ON public.financial_goals AS RESTRICTIVE FOR SELECT TO authenticated
  USING (public.can_team('goals.view'));
CREATE POLICY team_goals_write ON public.financial_goals AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (public.can_team('goals.edit'));
CREATE POLICY team_goals_update ON public.financial_goals AS RESTRICTIVE FOR UPDATE TO authenticated
  USING (public.can_team('goals.edit'));
CREATE POLICY team_goals_delete ON public.financial_goals AS RESTRICTIVE FOR DELETE TO authenticated
  USING (public.can_team('goals.edit'));

-- ============================================================
-- 5. ATRIBUIÇÃO AUTOMÁTICA DE AUTORIA
-- ============================================================
CREATE OR REPLACE FUNCTION public.set_team_created_by()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid;
BEGIN
  _me := public.team_self_member_id();
  IF _me IS NOT NULL THEN
    NEW.created_by_team_member_id := _me;
    IF NEW.assigned_team_member_id IS NULL THEN
      NEW.assigned_team_member_id := _me;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_team_created_by ON public.clients;
CREATE TRIGGER trg_set_team_created_by BEFORE INSERT ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.set_team_created_by();
DROP TRIGGER IF EXISTS trg_set_team_created_by ON public.opportunities;
CREATE TRIGGER trg_set_team_created_by BEFORE INSERT ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.set_team_created_by();
DROP TRIGGER IF EXISTS trg_set_team_created_by ON public.operations;
CREATE TRIGGER trg_set_team_created_by BEFORE INSERT ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.set_team_created_by();

-- Impede colaborador de trocar autoria/agência em UPDATE
CREATE OR REPLACE FUNCTION public.guard_team_attribution()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _me uuid;
BEGIN
  _me := public.team_self_member_id();
  IF _me IS NULL THEN RETURN NEW; END IF;
  NEW.created_by_team_member_id := OLD.created_by_team_member_id;
  IF NEW.assigned_team_member_id IS DISTINCT FROM OLD.assigned_team_member_id
     AND NOT public.can_team(TG_ARGV[0]) THEN
    NEW.assigned_team_member_id := OLD.assigned_team_member_id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_guard_team_attribution ON public.clients;
CREATE TRIGGER trg_guard_team_attribution BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_attribution('clients.assign');
DROP TRIGGER IF EXISTS trg_guard_team_attribution ON public.opportunities;
CREATE TRIGGER trg_guard_team_attribution BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_attribution('opportunities.assign');
DROP TRIGGER IF EXISTS trg_guard_team_attribution ON public.operations;
CREATE TRIGGER trg_guard_team_attribution BEFORE UPDATE ON public.operations
  FOR EACH ROW EXECUTE FUNCTION public.guard_team_attribution('operations.assign');

-- ============================================================
-- 6. CONVITES RESERVAM VAGA
-- ============================================================
CREATE OR REPLACE FUNCTION public.team_seats_taken(_agency_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT (SELECT COUNT(*)::int FROM public.agency_team_members m
          WHERE m.agency_id = _agency_id AND m.status IN ('active','blocked'))
       + (SELECT COUNT(*)::int FROM public.agency_team_invites i
          WHERE i.agency_id = _agency_id AND i.accepted_at IS NULL
            AND i.revoked_at IS NULL AND i.expires_at > now())
$$;
REVOKE EXECUTE ON FUNCTION public.team_seats_taken(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_seats_taken(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.team_member_quota()
RETURNS TABLE(used integer, total integer, plan text, pending integer)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _agency uuid;
BEGIN
  _agency := public.user_agency_id(auth.uid());
  RETURN QUERY
    SELECT public.team_seats_taken(_agency),
           public.team_max_members(_agency),
           public.get_user_plan(_agency)::text,
           (SELECT COUNT(*)::int FROM public.agency_team_invites i
            WHERE i.agency_id = _agency AND i.accepted_at IS NULL
              AND i.revoked_at IS NULL AND i.expires_at > now());
END $$;

-- Aceite de convite revalida limite de forma transacional
CREATE OR REPLACE FUNCTION public.enforce_team_member_limit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE total INT; allowed INT; pending INT;
BEGIN
  IF (TG_OP = 'INSERT' AND NEW.status IN ('active','blocked'))
     OR (TG_OP = 'UPDATE' AND NEW.status IN ('active','blocked') AND OLD.status NOT IN ('active','blocked')) THEN
    allowed := public.team_max_members(NEW.agency_id);
    SELECT COUNT(*) INTO total FROM public.agency_team_members
    WHERE agency_id = NEW.agency_id AND status IN ('active','blocked')
      AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);
    -- convites pendentes reservam vaga, exceto o convite que está sendo aceito
    SELECT COUNT(*) INTO pending FROM public.agency_team_invites i
    WHERE i.agency_id = NEW.agency_id AND i.accepted_at IS NULL
      AND i.revoked_at IS NULL AND i.expires_at > now()
      AND lower(i.email) <> lower(COALESCE(NEW.login, ''));
    IF total + pending >= allowed THEN
      RAISE EXCEPTION 'Limite de % acesso(s) de equipe atingido (incluindo convites pendentes).', allowed
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN NEW;
END $$;

-- ============================================================
-- 7. ADMINISTRADOR COM team.manage LÊ DADOS DE EQUIPE
-- ============================================================
DROP POLICY IF EXISTS "Owner reads own agency invites" ON public.agency_team_invites;
CREATE POLICY "Agency managers read invites" ON public.agency_team_invites
  FOR SELECT TO authenticated
  USING (agency_id = public.user_agency_id(auth.uid()) AND public.team_can_manage_team());
