-- =========================================================
-- FASE 2 VIP — preparação de orçamentos para seleção de serviços
-- =========================================================

-- Helper: resolve o agency_id (titular) de um user_id qualquer
CREATE OR REPLACE FUNCTION public.resolve_agency_id_for_user(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT m.agency_id FROM public.agency_membership m WHERE m.user_id = _user_id),
    (SELECT tm.agency_id FROM public.agency_team_members tm WHERE tm.auth_user_id = _user_id LIMIT 1),
    _user_id
  );
$$;

REVOKE ALL ON FUNCTION public.resolve_agency_id_for_user(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_agency_id_for_user(uuid) TO authenticated, service_role;

-- RPC admin: resolve titular + nome da agência (para conceder entitlement no lugar certo)
CREATE OR REPLACE FUNCTION public.admin_resolve_agency_owner(_user_id uuid)
RETURNS TABLE(agency_owner_id uuid, agency_name text, owner_name text, owner_email text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Acesso negado';
  END IF;

  v_owner := public.resolve_agency_id_for_user(_user_id);

  RETURN QUERY
  SELECT v_owner,
         p.agency_name,
         p.name,
         p.email
  FROM public.profiles p
  WHERE p.user_id = v_owner;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_resolve_agency_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_resolve_agency_owner(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------
-- 1) Configuração no orçamento (aditivo)
-- ---------------------------------------------------------
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS booking_requests_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_disclaimer text NOT NULL DEFAULT 'Esta é uma solicitação de reserva. Serviços, disponibilidade e valores serão reconfirmados pela agência antes da conclusão.',
  ADD COLUMN IF NOT EXISTS booking_deadline date NULL;

-- Trigger: bloqueia ativação sem entitlement ativo (defesa no banco)
CREATE OR REPLACE FUNCTION public.enforce_quote_booking_entitlement()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_agency uuid;
BEGIN
  IF COALESCE(NEW.booking_requests_enabled, false) = false THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND COALESCE(OLD.booking_requests_enabled, false) = true THEN
    RETURN NEW; -- já estava ativo; não re-valida em updates comuns
  END IF;

  v_agency := public.resolve_agency_id_for_user(NEW.user_id);

  IF NOT public.agency_has_entitlement(v_agency, 'booking_requests') THEN
    RAISE EXCEPTION 'Recurso de pedidos de reserva não está habilitado para esta agência';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quote_booking_entitlement ON public.quotes;
CREATE TRIGGER trg_enforce_quote_booking_entitlement
BEFORE INSERT OR UPDATE OF booking_requests_enabled ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_booking_entitlement();

-- ---------------------------------------------------------
-- 3) Grupos de escolha
-- ---------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quote_service_choice_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  group_type text NOT NULL,
  min_select integer NOT NULL DEFAULT 0,
  max_select integer NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_choice_groups_title_not_empty CHECK (length(btrim(title)) > 0),
  CONSTRAINT quote_choice_groups_type_check CHECK (group_type IN ('alternative','free')),
  CONSTRAINT quote_choice_groups_min_check CHECK (min_select >= 0),
  CONSTRAINT quote_choice_groups_max_check CHECK (max_select IS NULL OR max_select >= min_select),
  CONSTRAINT quote_choice_groups_alternative_single CHECK (
    group_type <> 'alternative' OR (min_select = 1 AND max_select = 1)
  )
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_service_choice_groups TO authenticated;
GRANT ALL ON public.quote_service_choice_groups TO service_role;

ALTER TABLE public.quote_service_choice_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage choice groups of their quotes"
ON public.quote_service_choice_groups
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quotes q
  WHERE q.id = quote_service_choice_groups.quote_id AND q.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quotes q
  WHERE q.id = quote_service_choice_groups.quote_id AND q.user_id = auth.uid()
));

CREATE INDEX IF NOT EXISTS idx_quote_choice_groups_quote ON public.quote_service_choice_groups(quote_id);

CREATE TRIGGER update_quote_choice_groups_updated_at
BEFORE UPDATE ON public.quote_service_choice_groups
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Normaliza grupos "alternative" para escolha única e garante user_id = dono do orçamento
CREATE OR REPLACE FUNCTION public.normalize_quote_choice_group()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.group_type = 'alternative' THEN
    NEW.min_select := 1;
    NEW.max_select := 1;
  END IF;

  SELECT q.user_id INTO NEW.user_id FROM public.quotes q WHERE q.id = NEW.quote_id;
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'Orçamento inválido para o grupo de escolha';
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_normalize_quote_choice_group
BEFORE INSERT OR UPDATE ON public.quote_service_choice_groups
FOR EACH ROW EXECUTE FUNCTION public.normalize_quote_choice_group();

-- ---------------------------------------------------------
-- 2) Regras por serviço
-- ---------------------------------------------------------
ALTER TABLE public.quote_services
  ADD COLUMN IF NOT EXISTS selection_mode text NOT NULL DEFAULT 'optional',
  ADD COLUMN IF NOT EXISTS choice_group_id uuid NULL
    REFERENCES public.quote_service_choice_groups(id) ON DELETE SET NULL;

ALTER TABLE public.quote_services
  DROP CONSTRAINT IF EXISTS quote_services_selection_mode_check;
ALTER TABLE public.quote_services
  ADD CONSTRAINT quote_services_selection_mode_check
  CHECK (selection_mode IN ('optional','required','alternative','free'));

CREATE INDEX IF NOT EXISTS idx_quote_services_choice_group ON public.quote_services(choice_group_id);

-- Integridade: grupo do mesmo orçamento, tipo compatível e grupo obrigatório
CREATE OR REPLACE FUNCTION public.enforce_quote_service_selection_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_group RECORD;
BEGIN
  IF NEW.selection_mode NOT IN ('alternative','free') THEN
    NEW.choice_group_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.choice_group_id IS NULL THEN
    RAISE EXCEPTION 'Serviços com modo "%" precisam pertencer a um grupo de escolha', NEW.selection_mode;
  END IF;

  SELECT * INTO v_group
  FROM public.quote_service_choice_groups g
  WHERE g.id = NEW.choice_group_id;

  IF v_group IS NULL OR v_group.quote_id <> NEW.quote_id THEN
    RAISE EXCEPTION 'Grupo de escolha inválido para este orçamento';
  END IF;

  IF v_group.group_type <> NEW.selection_mode THEN
    RAISE EXCEPTION 'O grupo "%" é do tipo % e não aceita serviços no modo %',
      v_group.title, v_group.group_type, NEW.selection_mode;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_quote_service_selection_rules ON public.quote_services;
CREATE TRIGGER trg_enforce_quote_service_selection_rules
BEFORE INSERT OR UPDATE OF selection_mode, choice_group_id, quote_id ON public.quote_services
FOR EACH ROW EXECUTE FUNCTION public.enforce_quote_service_selection_rules();

-- Ao excluir grupo: serviços voltam a "optional" (menor risco, sem perda do serviço)
CREATE OR REPLACE FUNCTION public.reset_services_on_choice_group_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.quote_services
  SET selection_mode = 'optional', choice_group_id = NULL
  WHERE choice_group_id = OLD.id;
  RETURN OLD;
END;
$$;

CREATE TRIGGER trg_reset_services_on_choice_group_delete
BEFORE DELETE ON public.quote_service_choice_groups
FOR EACH ROW EXECUTE FUNCTION public.reset_services_on_choice_group_delete();

-- ---------------------------------------------------------
-- 7) Payload público (backward-compatible)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_quote_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
  agent_record RECORD;
  services_data json;
  sections_data json;
  groups_data json;
  agent_profile json;
  agency_slug_check text;
  quote_json jsonb;
  v_agency uuid;
  v_booking_enabled boolean := false;
BEGIN
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO quote_record
  FROM public.quotes
  WHERE public_access_code = p_code
    AND status = 'published';

  IF quote_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT * INTO agent_record
  FROM public.profiles
  WHERE user_id = quote_record.user_id;

  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);

  IF agency_slug_check != p_agency_slug THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.quote_services s WHERE s.quote_id = quote_record.id;

  SELECT json_agg(json_build_object(
    'id', sec.id,
    'quote_id', sec.quote_id,
    'title', sec.title,
    'order_index', sec.order_index
  ) ORDER BY sec.order_index) INTO sections_data
  FROM public.quote_sections sec WHERE sec.quote_id = quote_record.id;

  SELECT json_agg(json_build_object(
    'id', g.id,
    'title', g.title,
    'group_type', g.group_type,
    'min_select', g.min_select,
    'max_select', g.max_select,
    'order_index', g.order_index
  ) ORDER BY g.order_index) INTO groups_data
  FROM public.quote_service_choice_groups g WHERE g.quote_id = quote_record.id;

  -- flag efetiva: só true se o orçamento marcou E a agência tem entitlement ativo
  IF COALESCE(quote_record.booking_requests_enabled, false) THEN
    v_agency := public.resolve_agency_id_for_user(quote_record.user_id);
    v_booking_enabled := public.agency_has_entitlement(v_agency, 'booking_requests');
  END IF;

  quote_json := to_jsonb(quote_record)
    || jsonb_build_object('booking_requests_enabled', v_booking_enabled);

  agent_profile := json_build_object(
    'name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url,
    'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url,
    'city', agent_record.city, 'state', agent_record.state
  );

  RETURN json_build_object(
    'quote', quote_json,
    'services', COALESCE(services_data, '[]'::json),
    'sections', COALESCE(sections_data, '[]'::json),
    'choice_groups', COALESCE(groups_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$function$;