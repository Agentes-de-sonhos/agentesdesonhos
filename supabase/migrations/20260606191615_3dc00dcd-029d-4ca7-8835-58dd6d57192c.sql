
-- ============================================================
-- FASE 1: Usuários da Equipe — acesso real a CRM e Financeiro
-- ============================================================

-- 1) Tabela de vínculo usuário → agência
CREATE TABLE IF NOT EXISTS public.agency_membership (
  user_id    uuid PRIMARY KEY,
  agency_id  uuid NOT NULL,
  role       text NOT NULL CHECK (role IN ('master','team')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agency_membership_agency ON public.agency_membership(agency_id);

GRANT SELECT ON public.agency_membership TO authenticated;
GRANT ALL    ON public.agency_membership TO service_role;

ALTER TABLE public.agency_membership ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "user can read own membership" ON public.agency_membership;
CREATE POLICY "user can read own membership"
  ON public.agency_membership FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 2) Backfill: todo usuário em profiles vira master da própria agência
INSERT INTO public.agency_membership (user_id, agency_id, role)
SELECT p.user_id, p.user_id, 'master'
FROM public.profiles p
ON CONFLICT (user_id) DO NOTHING;

-- 3) Vincula auth_user_id em agency_team_members
ALTER TABLE public.agency_team_members
  ADD COLUMN IF NOT EXISTS auth_user_id uuid UNIQUE,
  ADD COLUMN IF NOT EXISTS synthetic_email text UNIQUE;

-- 4) Helpers
CREATE OR REPLACE FUNCTION public.current_agency_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT agency_id FROM public.agency_membership WHERE user_id = auth.uid()
$$;

CREATE OR REPLACE FUNCTION public.is_agency_member(_owner uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    _owner IS NOT NULL AND (
      _owner = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.agency_membership me
        JOIN public.agency_membership owner ON owner.agency_id = me.agency_id
        WHERE me.user_id = auth.uid() AND owner.user_id = _owner
      )
    )
$$;

-- 5) Sync trigger: agency_team_members ↔ agency_membership
CREATE OR REPLACE FUNCTION public.sync_agency_membership_from_team_member()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    IF OLD.auth_user_id IS NOT NULL THEN
      DELETE FROM public.agency_membership WHERE user_id = OLD.auth_user_id;
    END IF;
    RETURN OLD;
  END IF;

  IF NEW.auth_user_id IS NOT NULL THEN
    IF NEW.status = 'active' THEN
      INSERT INTO public.agency_membership (user_id, agency_id, role)
      VALUES (NEW.auth_user_id, NEW.agency_id, 'team')
      ON CONFLICT (user_id) DO UPDATE
        SET agency_id = EXCLUDED.agency_id, role = 'team';
    ELSE
      DELETE FROM public.agency_membership WHERE user_id = NEW.auth_user_id;
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_sync_agency_membership ON public.agency_team_members;
CREATE TRIGGER trg_sync_agency_membership
  AFTER INSERT OR UPDATE OR DELETE ON public.agency_team_members
  FOR EACH ROW EXECUTE FUNCTION public.sync_agency_membership_from_team_member();

-- Backfill membership para membros já com auth_user_id (caso haja)
INSERT INTO public.agency_membership (user_id, agency_id, role)
SELECT auth_user_id, agency_id, 'team'
FROM public.agency_team_members
WHERE auth_user_id IS NOT NULL AND status = 'active'
ON CONFLICT (user_id) DO NOTHING;

-- 6) Trigger universal: forçar user_id = dono da agência em INSERT
CREATE OR REPLACE FUNCTION public.force_user_id_to_agency_owner()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_agency uuid;
BEGIN
  v_agency := public.current_agency_id();
  IF v_agency IS NOT NULL THEN
    NEW.user_id := v_agency;
  END IF;
  RETURN NEW;
END $$;

-- 7) Aplicar trigger + reescrever policies em todas as tabelas
DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'clients','customer_payments','expense_entries','financial_goals',
    'invoice_installments','invoice_payments','invoice_services','invoices',
    'operation_attachments','operation_label_assignments','operation_labels',
    'operation_pipeline_stages','operation_tasks','operation_timeline',
    'operations','opportunities','opportunity_label_assignments',
    'opportunity_labels','opportunity_notes','pipeline_stages',
    'sale_products','sales','sales_goals','sellers'
  ];
  pol record;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    -- Drop policies que dependem de user_id = auth.uid()
    FOR pol IN
      SELECT policyname FROM pg_policies
       WHERE schemaname='public' AND tablename = t
         AND (qual ILIKE '%user_id%' OR with_check ILIKE '%user_id%')
         AND policyname NOT ILIKE '%public%'
    LOOP
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', pol.policyname, t);
    END LOOP;

    -- Cria política única FOR ALL com is_agency_member
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (public.is_agency_member(user_id)) WITH CHECK (public.is_agency_member(user_id))',
      'agency_members_full_access', t
    );

    -- Anexa trigger BEFORE INSERT para normalizar user_id
    EXECUTE format('DROP TRIGGER IF EXISTS trg_force_user_id_agency ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER trg_force_user_id_agency BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.force_user_id_to_agency_owner()',
      t
    );
  END LOOP;
END $$;

-- 8) opportunity_history: usa EXISTS parent — reescrever
DROP POLICY IF EXISTS "Users can create history for their opportunities" ON public.opportunity_history;
DROP POLICY IF EXISTS "Users can view history of their opportunities" ON public.opportunity_history;

CREATE POLICY "agency_members_history_select"
  ON public.opportunity_history FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = opportunity_history.opportunity_id
      AND public.is_agency_member(o.user_id)
  ));

CREATE POLICY "agency_members_history_insert"
  ON public.opportunity_history FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = opportunity_history.opportunity_id
      AND public.is_agency_member(o.user_id)
  ));

-- 9) tour_operators: permitir que membros da equipe vejam fornecedores da própria agência
DROP POLICY IF EXISTS "Authenticated can view operators" ON public.tour_operators;
CREATE POLICY "Authenticated can view operators"
  ON public.tour_operators FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR public.is_agency_member(user_id)
    OR public.is_agency_member(owner_agency_id)
    OR (is_active = true AND COALESCE(approval_status, 'approved'::text) = 'approved'::text
        AND (owner_agency_id IS NULL OR public.is_agency_member(owner_agency_id)))
  );

-- 10) RPC team_self: contexto da sessão do membro da equipe
CREATE OR REPLACE FUNCTION public.team_self()
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  m RECORD; perms json; stage_perms json;
BEGIN
  SELECT * INTO m FROM public.agency_team_members
   WHERE auth_user_id = auth.uid() AND status = 'active'
   LIMIT 1;
  IF m IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(json_agg(json_build_object(
    'module_key', module_key, 'permission_key', permission_key, 'enabled', enabled
  )), '[]'::json) INTO perms
  FROM public.agency_team_permissions WHERE team_member_id = m.id;

  SELECT COALESCE(json_agg(json_build_object(
    'pipeline_type', pipeline_type, 'stage_id', stage_id,
    'can_view', can_view, 'can_edit', can_edit, 'can_move', can_move
  )), '[]'::json) INTO stage_perms
  FROM public.agency_team_stage_permissions WHERE team_member_id = m.id;

  RETURN json_build_object(
    'member', json_build_object(
      'id', m.id, 'agency_id', m.agency_id, 'login', m.login,
      'full_name', m.full_name, 'role_title', m.role_title
    ),
    'permissions', perms,
    'stage_permissions', stage_perms
  );
END $$;

GRANT EXECUTE ON FUNCTION public.team_self() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_agency_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_agency_member(uuid) TO authenticated;

-- 11) Corrige limite de team members no trigger (já 3, ok)
--     (apenas garantia: sem alteração necessária)

-- 12) Trigger handle_new_user: garantir membership ao criar profile
CREATE OR REPLACE FUNCTION public.ensure_master_membership()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.agency_membership (user_id, agency_id, role)
  VALUES (NEW.user_id, NEW.user_id, 'master')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_ensure_master_membership ON public.profiles;
CREATE TRIGGER trg_ensure_master_membership
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.ensure_master_membership();
