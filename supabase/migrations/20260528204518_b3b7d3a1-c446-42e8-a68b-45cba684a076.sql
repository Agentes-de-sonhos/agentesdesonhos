
-- Helper: normaliza telefone para comparação (apenas dígitos)
CREATE OR REPLACE FUNCTION public._normalize_phone(p text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT regexp_replace(coalesce(p, ''), '\D', '', 'g');
$$;

-- Função principal: garante cliente + oportunidade na 1ª coluna
CREATE OR REPLACE FUNCTION public.ensure_client_and_opportunity_for_lead(
  _user_id uuid,
  _name text,
  _phone text,
  _email text,
  _destination text
)
RETURNS TABLE(client_id uuid, opportunity_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_id uuid;
  v_opp_id uuid;
  v_stage_id uuid;
  v_stage_key text;
  v_dest text := COALESCE(NULLIF(trim(_destination), ''), 'A definir');
  v_phone_norm text := public._normalize_phone(_phone);
BEGIN
  -- Encontrar cliente existente por telefone normalizado (mesmo usuário)
  SELECT id INTO v_client_id
  FROM public.clients
  WHERE user_id = _user_id
    AND v_phone_norm <> ''
    AND public._normalize_phone(phone) = v_phone_norm
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_client_id IS NULL THEN
    INSERT INTO public.clients (user_id, name, phone, email, status, last_interaction_at)
    VALUES (_user_id, COALESCE(NULLIF(trim(_name), ''), 'Lead sem nome'), _phone, NULLIF(trim(_email), ''), 'lead', now())
    RETURNING id INTO v_client_id;
  ELSE
    UPDATE public.clients
       SET last_interaction_at = now(),
           email = COALESCE(email, NULLIF(trim(_email), '')),
           updated_at = now()
     WHERE id = v_client_id;
  END IF;

  -- Determinar primeira coluna do funil deste usuário
  SELECT id, legacy_key INTO v_stage_id, v_stage_key
  FROM public.pipeline_stages
  WHERE user_id = _user_id
  ORDER BY position ASC
  LIMIT 1;

  -- Inserir oportunidade na primeira coluna
  INSERT INTO public.opportunities (
    user_id, client_id, destination, passengers_count,
    estimated_value, stage, stage_id, notes
  ) VALUES (
    _user_id, v_client_id, v_dest, 1, 0,
    COALESCE(v_stage_key, 'new_contact'),
    v_stage_id,
    'Criada automaticamente a partir de lead recebido.'
  )
  RETURNING id INTO v_opp_id;

  client_id := v_client_id;
  opportunity_id := v_opp_id;
  RETURN NEXT;
END;
$$;

-- Trigger para lead_captures (Formulário Conversacional)
CREATE OR REPLACE FUNCTION public.trg_lead_capture_to_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.ensure_client_and_opportunity_for_lead(
    NEW.agent_user_id,
    NEW.lead_name,
    NEW.lead_phone,
    NULL,
    NEW.destination
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lead_capture_to_opp ON public.lead_captures;
CREATE TRIGGER trg_lead_capture_to_opp
AFTER INSERT ON public.lead_captures
FOR EACH ROW EXECUTE FUNCTION public.trg_lead_capture_to_opportunity();

-- Trigger para sales_landing_leads (Página de Vendas)
CREATE OR REPLACE FUNCTION public.trg_sales_landing_lead_to_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF NEW.client_id IS NOT NULL AND NEW.opportunity_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT * INTO r FROM public.ensure_client_and_opportunity_for_lead(
    NEW.user_id, NEW.lead_name, NEW.lead_phone, NULL, NULL
  );

  UPDATE public.sales_landing_leads
     SET client_id = COALESCE(client_id, r.client_id),
         opportunity_id = COALESCE(opportunity_id, r.opportunity_id)
   WHERE id = NEW.id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sales_landing_lead_to_opp ON public.sales_landing_leads;
CREATE TRIGGER trg_sales_landing_lead_to_opp
AFTER INSERT ON public.sales_landing_leads
FOR EACH ROW EXECUTE FUNCTION public.trg_sales_landing_lead_to_opportunity();
