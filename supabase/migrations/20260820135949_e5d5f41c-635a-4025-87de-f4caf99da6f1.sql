-- 1) Remove a política permissiva que anulava o escopo de equipe
DROP POLICY IF EXISTS agency_members_full_access ON public.opportunities;

-- 2) Recria as políticas de equipe com isolamento multi-tenant explícito
DROP POLICY IF EXISTS team_opps_select ON public.opportunities;
DROP POLICY IF EXISTS team_opps_update ON public.opportunities;
DROP POLICY IF EXISTS team_opps_delete ON public.opportunities;
DROP POLICY IF EXISTS team_opps_insert ON public.opportunities;

CREATE POLICY team_opps_select ON public.opportunities
FOR SELECT TO authenticated
USING (
  user_id = public.user_agency_id(auth.uid())
  AND public.can_team('opportunities.view')
  AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id)
);

CREATE POLICY team_opps_insert ON public.opportunities
FOR INSERT TO authenticated
WITH CHECK (
  user_id = public.user_agency_id(auth.uid())
  AND public.can_team('opportunities.create')
  AND ((public.team_self_member_id() IS NULL) OR (created_by_team_member_id = public.team_self_member_id()))
);

CREATE POLICY team_opps_update ON public.opportunities
FOR UPDATE TO authenticated
USING (
  user_id = public.user_agency_id(auth.uid())
  AND public.can_team('opportunities.edit')
  AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id)
)
WITH CHECK (
  user_id = public.user_agency_id(auth.uid())
  AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id)
);

CREATE POLICY team_opps_delete ON public.opportunities
FOR DELETE TO authenticated
USING (
  user_id = public.user_agency_id(auth.uid())
  AND public.can_team('opportunities.delete')
  AND public.team_record_visible('opportunities', created_by_team_member_id, assigned_team_member_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;

-- 3) Trigger de integridade da atribuição
CREATE OR REPLACE FUNCTION public.opportunities_team_assignment_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _self uuid;
BEGIN
  _self := public.team_self_member_id();

  IF TG_OP = 'INSERT' THEN
    IF NEW.created_by_team_member_id IS NULL THEN
      NEW.created_by_team_member_id := _self;
    END IF;
    IF _self IS NOT NULL AND NEW.assigned_team_member_id IS NULL THEN
      NEW.assigned_team_member_id := _self;
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Colaborador não pode transferir a titularidade da oportunidade
    IF _self IS NOT NULL
       AND COALESCE(NEW.assigned_team_member_id::text, '') <> COALESCE(OLD.assigned_team_member_id::text, '') THEN
      RAISE EXCEPTION 'Somente a conta proprietária pode alterar o responsável da oportunidade.';
    END IF;
  END IF;

  -- Responsável precisa pertencer à mesma agência
  IF NEW.assigned_team_member_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.agency_team_members m
      WHERE m.id = NEW.assigned_team_member_id AND m.agency_id = NEW.user_id
    ) THEN
      RAISE EXCEPTION 'Responsável informado não pertence a esta agência.';
    END IF;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_opportunities_team_assignment_guard ON public.opportunities;
CREATE TRIGGER trg_opportunities_team_assignment_guard
BEFORE INSERT OR UPDATE ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.opportunities_team_assignment_guard();

-- 4) Tabelas-filhas seguem a visibilidade da oportunidade
CREATE OR REPLACE FUNCTION public.opportunity_visible(_opportunity_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.opportunities o
    WHERE o.id = _opportunity_id
      AND o.user_id = public.user_agency_id(auth.uid())
      AND public.team_record_visible('opportunities', o.created_by_team_member_id, o.assigned_team_member_id)
  )
$$;

DROP POLICY IF EXISTS agency_members_history_select ON public.opportunity_history;
DROP POLICY IF EXISTS agency_members_history_insert ON public.opportunity_history;
CREATE POLICY agency_members_history_select ON public.opportunity_history
FOR SELECT TO authenticated USING (public.opportunity_visible(opportunity_id));
CREATE POLICY agency_members_history_insert ON public.opportunity_history
FOR INSERT TO authenticated WITH CHECK (public.opportunity_visible(opportunity_id));

DROP POLICY IF EXISTS agency_members_full_access ON public.opportunity_notes;
CREATE POLICY agency_members_notes_access ON public.opportunity_notes
FOR ALL TO authenticated
USING (public.is_agency_member(user_id) AND public.opportunity_visible(opportunity_id))
WITH CHECK (public.is_agency_member(user_id) AND public.opportunity_visible(opportunity_id));

DROP POLICY IF EXISTS agency_members_full_access ON public.opportunity_label_assignments;
CREATE POLICY agency_members_label_assignments_access ON public.opportunity_label_assignments
FOR ALL TO authenticated
USING (public.is_agency_member(user_id) AND public.opportunity_visible(opportunity_id))
WITH CHECK (public.is_agency_member(user_id) AND public.opportunity_visible(opportunity_id));

DROP POLICY IF EXISTS followups_select_agency ON public.opportunity_followups;
CREATE POLICY followups_select_agency ON public.opportunity_followups
FOR SELECT TO authenticated
USING (
  (public.is_agency_member(user_id) AND public.opportunity_visible(opportunity_id))
  OR auth.uid() = created_by
);