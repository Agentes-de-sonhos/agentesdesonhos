-- ─────────────────────────────────────────────────────────────
-- 1) Follow-up com horário e fuso (aditivo)
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.opportunity_followups
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS time_zone text NULL;

ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS follow_up_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_opportunity_followups_created_by_at
  ON public.opportunity_followups (created_by, follow_up_date);

-- Mantém follow_up_date coerente com follow_up_at usando o fuso civil informado.
-- Nunca inventa horário para registros legados (follow_up_at NULL).
CREATE OR REPLACE FUNCTION public.sync_followup_at_civil_date()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tz text;
BEGIN
  IF NEW.follow_up_at IS NOT NULL THEN
    v_tz := COALESCE(NULLIF(trim(NEW.time_zone), ''), 'America/Sao_Paulo');
    BEGIN
      NEW.follow_up_date := (NEW.follow_up_at AT TIME ZONE v_tz)::date;
    EXCEPTION WHEN OTHERS THEN
      v_tz := 'America/Sao_Paulo';
      NEW.follow_up_date := (NEW.follow_up_at AT TIME ZONE v_tz)::date;
    END;
    NEW.time_zone := v_tz;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_followup_at_civil_date ON public.opportunity_followups;
CREATE TRIGGER trg_sync_followup_at_civil_date
  BEFORE INSERT OR UPDATE ON public.opportunity_followups
  FOR EACH ROW EXECUTE FUNCTION public.sync_followup_at_civil_date();

-- Espelhamento na Agenda: horário marcado quando houver follow_up_at.
CREATE OR REPLACE FUNCTION public.sync_followup_to_agency_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_client_id uuid;
  v_client_name text;
  v_title text;
  v_tz text;
  v_time time without time zone;
  v_start timestamptz;
  v_all_day boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.agency_events
       SET deleted_at = now()
     WHERE followup_id = OLD.id
       AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  v_owner := COALESCE(NEW.created_by, NEW.user_id);

  SELECT o.client_id, c.name
    INTO v_client_id, v_client_name
    FROM public.opportunities o
    LEFT JOIN public.clients c ON c.id = o.client_id
   WHERE o.id = NEW.opportunity_id;

  v_title := CASE
    WHEN v_client_name IS NOT NULL AND length(trim(v_client_name)) > 0
      THEN 'Follow-up: ' || v_client_name
    ELSE 'Follow-up'
  END;

  v_tz := COALESCE(NULLIF(trim(NEW.time_zone), ''), 'America/Sao_Paulo');

  IF NEW.follow_up_at IS NOT NULL THEN
    v_all_day := false;
    v_start := NEW.follow_up_at;
    v_time := (NEW.follow_up_at AT TIME ZONE v_tz)::time;
  ELSE
    v_all_day := true;
    v_start := NULL;
    v_time := NULL;
  END IF;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_events
      (user_id, title, description, event_type, event_date, event_time, color,
       client_id, opportunity_id, followup_id, start_at, time_zone, all_day)
    VALUES
      (v_owner, v_title, NEW.note, 'followup', NEW.follow_up_date, v_time, '#8b5cf6',
       v_client_id, NEW.opportunity_id, NEW.id, v_start, v_tz, v_all_day)
    ON CONFLICT (followup_id) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          event_date = EXCLUDED.event_date,
          event_time = EXCLUDED.event_time,
          start_at = EXCLUDED.start_at,
          time_zone = EXCLUDED.time_zone,
          all_day = EXCLUDED.all_day,
          client_id = EXCLUDED.client_id,
          opportunity_id = EXCLUDED.opportunity_id,
          deleted_at = NULL,
          updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.agency_events
       SET title = v_title,
           description = NEW.note,
           event_date = NEW.follow_up_date,
           event_time = v_time,
           start_at = v_start,
           time_zone = v_tz,
           all_day = v_all_day,
           client_id = v_client_id,
           opportunity_id = NEW.opportunity_id,
           deleted_at = NULL,
           updated_at = now()
     WHERE followup_id = NEW.id;

    IF NOT FOUND THEN
      INSERT INTO public.agency_events
        (user_id, title, description, event_type, event_date, event_time, color,
         client_id, opportunity_id, followup_id, start_at, time_zone, all_day)
      VALUES
        (v_owner, v_title, NEW.note, 'followup', NEW.follow_up_date, v_time, '#8b5cf6',
         v_client_id, NEW.opportunity_id, NEW.id, v_start, v_tz, v_all_day);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- ─────────────────────────────────────────────────────────────
-- 2) Empresas (opcional) e vínculo N:N com clientes
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  trade_name text,
  cnpj_normalized text,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.companies TO authenticated;
GRANT ALL ON public.companies TO service_role;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_companies_user_id ON public.companies (user_id);
CREATE INDEX IF NOT EXISTS idx_companies_user_name ON public.companies (user_id, name);
CREATE INDEX IF NOT EXISTS idx_companies_cnpj ON public.companies (user_id, cnpj_normalized);

DROP POLICY IF EXISTS companies_agency_members_full_access ON public.companies;
CREATE POLICY companies_agency_members_full_access ON public.companies
  FOR ALL TO authenticated
  USING (public.is_agency_member(user_id))
  WITH CHECK (public.is_agency_member(user_id));

DROP POLICY IF EXISTS team_companies_select ON public.companies;
CREATE POLICY team_companies_select ON public.companies
  FOR SELECT TO authenticated
  USING (public.can_team('clients.view') AND user_id = public.user_agency_id(auth.uid()));

DROP POLICY IF EXISTS team_companies_insert ON public.companies;
CREATE POLICY team_companies_insert ON public.companies
  FOR INSERT TO authenticated
  WITH CHECK (public.can_team('clients.create') AND user_id = public.user_agency_id(auth.uid()));

DROP POLICY IF EXISTS team_companies_update ON public.companies;
CREATE POLICY team_companies_update ON public.companies
  FOR UPDATE TO authenticated
  USING (public.can_team('clients.edit') AND user_id = public.user_agency_id(auth.uid()))
  WITH CHECK (user_id = public.user_agency_id(auth.uid()));

DROP POLICY IF EXISTS team_companies_delete ON public.companies;
CREATE POLICY team_companies_delete ON public.companies
  FOR DELETE TO authenticated
  USING (public.can_team('clients.delete') AND user_id = public.user_agency_id(auth.uid()));

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON public.companies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.client_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  relationship_type text NOT NULL DEFAULT 'employee',
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_companies_unique UNIQUE (client_id, company_id),
  CONSTRAINT client_companies_relationship_check CHECK (
    relationship_type IN ('employee', 'owner', 'buyer', 'traveler', 'other')
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.client_companies TO authenticated;
GRANT ALL ON public.client_companies TO service_role;
ALTER TABLE public.client_companies ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_client_companies_client ON public.client_companies (client_id);
CREATE INDEX IF NOT EXISTS idx_client_companies_company ON public.client_companies (company_id);
CREATE INDEX IF NOT EXISTS idx_client_companies_user ON public.client_companies (user_id);

DROP POLICY IF EXISTS client_companies_agency_members_full_access ON public.client_companies;
CREATE POLICY client_companies_agency_members_full_access ON public.client_companies
  FOR ALL TO authenticated
  USING (public.is_agency_member(user_id))
  WITH CHECK (public.is_agency_member(user_id));

DROP POLICY IF EXISTS team_client_companies_select ON public.client_companies;
CREATE POLICY team_client_companies_select ON public.client_companies
  FOR SELECT TO authenticated
  USING (public.can_team('clients.view') AND user_id = public.user_agency_id(auth.uid()));

DROP POLICY IF EXISTS team_client_companies_insert ON public.client_companies;
CREATE POLICY team_client_companies_insert ON public.client_companies
  FOR INSERT TO authenticated
  WITH CHECK (public.can_team('clients.edit') AND user_id = public.user_agency_id(auth.uid()));

DROP POLICY IF EXISTS team_client_companies_delete ON public.client_companies;
CREATE POLICY team_client_companies_delete ON public.client_companies
  FOR DELETE TO authenticated
  USING (public.can_team('clients.edit') AND user_id = public.user_agency_id(auth.uid()));

-- Empresa e cliente devem pertencer à MESMA agência do vínculo.
CREATE OR REPLACE FUNCTION public.validate_client_company_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_owner uuid;
  v_company_owner uuid;
BEGIN
  SELECT user_id INTO v_client_owner FROM public.clients WHERE id = NEW.client_id;
  SELECT user_id INTO v_company_owner FROM public.companies WHERE id = NEW.company_id;

  IF v_client_owner IS NULL OR v_company_owner IS NULL THEN
    RAISE EXCEPTION 'Cliente ou empresa não encontrados';
  END IF;

  IF v_client_owner <> v_company_owner THEN
    RAISE EXCEPTION 'Cliente e empresa devem pertencer à mesma agência';
  END IF;

  NEW.user_id := v_client_owner;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_client_company_agency ON public.client_companies;
CREATE TRIGGER trg_validate_client_company_agency
  BEFORE INSERT OR UPDATE ON public.client_companies
  FOR EACH ROW EXECUTE FUNCTION public.validate_client_company_agency();

-- ─────────────────────────────────────────────────────────────
-- 3) Contexto de viagem e empresa na oportunidade
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.opportunities
  ADD COLUMN IF NOT EXISTS travel_context text NOT NULL DEFAULT 'personal',
  ADD COLUMN IF NOT EXISTS company_id uuid NULL REFERENCES public.companies(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_opportunities_company ON public.opportunities (company_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'opportunities_travel_context_check'
       AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_travel_context_check
      CHECK (travel_context IN ('personal', 'corporate'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conname = 'opportunities_travel_context_company_check'
       AND conrelid = 'public.opportunities'::regclass
  ) THEN
    ALTER TABLE public.opportunities
      ADD CONSTRAINT opportunities_travel_context_company_check
      CHECK (
        (travel_context = 'corporate' AND company_id IS NOT NULL)
        OR (travel_context = 'personal' AND company_id IS NULL)
      );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_opportunity_company_agency()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_owner uuid;
BEGIN
  IF NEW.company_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT user_id INTO v_company_owner FROM public.companies WHERE id = NEW.company_id;
  IF v_company_owner IS NULL THEN
    RAISE EXCEPTION 'Empresa não encontrada';
  END IF;
  IF v_company_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Empresa deve pertencer à mesma agência da oportunidade';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_opportunity_company_agency ON public.opportunities;
CREATE TRIGGER trg_validate_opportunity_company_agency
  BEFORE INSERT OR UPDATE OF company_id, travel_context, user_id ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.validate_opportunity_company_agency();