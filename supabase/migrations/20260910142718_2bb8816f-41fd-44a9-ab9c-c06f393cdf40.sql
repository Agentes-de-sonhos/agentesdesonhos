-- 1) Elegibilidade: resolve a agência da equipe e avalia plano/validade/concessões da master.
CREATE OR REPLACE FUNCTION private.reservations_owner_is_eligible(_owner uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_plan text;
  v_active boolean;
  v_expires timestamptz;
BEGIN
  IF _owner IS NULL THEN RETURN false; END IF;

  -- concessão individual da conta master (Central/CRM básico)
  IF EXISTS (SELECT 1 FROM public.user_feature_access ufa
              WHERE ufa.user_id = _owner AND ufa.feature_key = 'crm_basic') THEN
    RETURN true;
  END IF;

  SELECT s.plan::text, s.is_active, s.expires_at
    INTO v_plan, v_active, v_expires
    FROM public.subscriptions s
   WHERE s.user_id = _owner AND s.is_active = true
   ORDER BY s.updated_at DESC NULLS LAST
   LIMIT 1;

  IF NOT COALESCE(v_active, false) THEN RETURN false; END IF;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN RETURN false; END IF;

  RETURN COALESCE(v_plan, 'start') IN ('premium', 'fundador', 'promo_grupo_sc');
END $$;

REVOKE ALL ON FUNCTION private.reservations_owner_is_eligible(uuid) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.can_use_reservations_center()
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_member_id uuid;
  v_member_status public.team_member_status;
  v_agency uuid;
  v_owner uuid;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF public.has_role(v_uid, 'admin'::public.app_role)
     OR public.has_role(v_uid, 'promotor'::public.app_role) THEN
    RETURN true;
  END IF;

  SELECT m.id, m.status, m.agency_id
    INTO v_member_id, v_member_status, v_agency
    FROM public.agency_team_members m
   WHERE m.auth_user_id = v_uid
   ORDER BY m.created_at
   LIMIT 1;

  IF v_member_id IS NOT NULL THEN
    -- Colaborador: precisa estar ativo, ter permissão de reservas E a agência
    -- (conta master) precisa estar comercialmente elegível. Dono e equipe nunca
    -- ficam com elegibilidades contraditórias.
    IF v_member_status IS DISTINCT FROM 'active'::public.team_member_status THEN
      RETURN false;
    END IF;
    IF NOT public.can_team('reservations.view') THEN RETURN false; END IF;
    v_owner := v_agency;
  ELSE
    v_owner := v_uid;
    -- concessão individual do próprio proprietário
    IF EXISTS (SELECT 1 FROM public.user_feature_access ufa
                WHERE ufa.user_id = v_uid AND ufa.feature_key = 'crm_basic') THEN
      RETURN true;
    END IF;
  END IF;

  RETURN private.reservations_owner_is_eligible(v_owner);
END $$;

REVOKE ALL ON FUNCTION public.can_use_reservations_center() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_use_reservations_center() TO authenticated, service_role;

-- 2) Gate condicional para mutações de fichas MANUAIS (web_quote mantém regra anterior).
CREATE OR REPLACE FUNCTION private.assert_manual_file_gate(_origin text)
RETURNS void
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF _origin = 'manual' AND NOT public.can_use_reservations_center() THEN
    RAISE EXCEPTION 'A Central de Reservas não está disponível no seu plano atual.';
  END IF;
END $$;

REVOKE ALL ON FUNCTION private.assert_manual_file_gate(text) FROM PUBLIC, anon;

CREATE OR REPLACE FUNCTION public.travel_file_set_status(_file_id uuid, _status text, _reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _file public.travel_files;
  _clean_reason text := NULLIF(btrim(COALESCE(_reason, '')), '');
  _pre_sale text[] := ARRAY['draft','request_received','awaiting_reconfirmation','partially_available','awaiting_client'];
  _sold text[] := ARRAY['sale_confirmed','in_operation','trip_completed'];
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  PERFORM private.assert_manual_file_gate(_file.origin);

  IF _status NOT IN ('draft','request_received','awaiting_reconfirmation','partially_available',
                     'awaiting_client','sale_confirmed','in_operation','trip_completed','cancelled') THEN
    RAISE EXCEPTION 'Etapa inválida.';
  END IF;
  IF _status = 'draft' AND _file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Solicitações recebidas pelo site não voltam para rascunho.';
  END IF;
  IF _status = 'cancelled' AND _clean_reason IS NULL THEN
    RAISE EXCEPTION 'Informe o motivo do cancelamento.';
  END IF;
  IF _status = 'request_received' AND _file.status = ANY(_sold) THEN
    RAISE EXCEPTION 'Não é possível voltar para "Solicitação recebida" depois da venda confirmada. Escolha "Aguardando cliente" ou cancele o processo informando o motivo.';
  END IF;
  IF _status = 'draft' AND _file.status = ANY(_sold) THEN
    RAISE EXCEPTION 'Não é possível voltar para "Rascunho" depois da venda confirmada. Escolha "Aguardando cliente" ou cancele o processo informando o motivo.';
  END IF;

  UPDATE public.travel_files f
     SET status = _status,
         cancellation_reason = CASE WHEN _status = 'cancelled' THEN left(_clean_reason, 1000) ELSE NULL END,
         cancelled_at = CASE WHEN _status = 'cancelled' THEN COALESCE(f.cancelled_at, now()) ELSE NULL END,
         confirmed_at = CASE
             WHEN _status = ANY(_sold) THEN COALESCE(f.confirmed_at, now())
             WHEN _status = ANY(_pre_sale) THEN NULL
             ELSE f.confirmed_at END,
         completed_at = CASE
             WHEN _status = 'trip_completed' THEN COALESCE(f.completed_at, now())
             WHEN _status = 'cancelled' THEN f.completed_at
             ELSE NULL END,
         updated_at = now()
   WHERE f.id = _file.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_set_status(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_set_status(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_service_save(_service_id uuid, _status text DEFAULT NULL::text, _reconfirmed_amount numeric DEFAULT NULL::numeric, _sold_amount numeric DEFAULT NULL::numeric, _cost_amount numeric DEFAULT NULL::numeric, _commission_amount numeric DEFAULT NULL::numeric, _responsible uuid DEFAULT NULL::uuid, _touch_financials boolean DEFAULT false, _touch_responsible boolean DEFAULT false)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _svc public.travel_file_services;
  _file public.travel_files;
  _changed boolean;
BEGIN
  SELECT * INTO _svc FROM public.travel_file_services WHERE id = _service_id;
  IF _svc.id IS NULL THEN RAISE EXCEPTION 'Serviço não encontrado.'; END IF;
  _file := private.assert_travel_file_access(_svc.file_id, 'reservations.manage');
  PERFORM private.assert_manual_file_gate(_file.origin);

  IF _status IS NOT NULL AND _status NOT IN ('requested','reconfirming','available','amount_changed',
      'unavailable','awaiting_client','booked','paid','issued','delivered','cancelled') THEN
    RAISE EXCEPTION 'Situação de serviço inválida.';
  END IF;

  IF _touch_financials THEN
    _changed := (_sold_amount IS DISTINCT FROM _svc.sold_amount)
             OR (_cost_amount IS DISTINCT FROM _svc.cost_amount);
    IF _changed AND NOT public.can_team('reservations.financial.manage') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar os valores financeiros da reserva.';
    END IF;
    IF (_commission_amount IS DISTINCT FROM _svc.commission_amount)
       AND NOT public.can_team('financial.commissions.manage') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar comissões.';
    END IF;
  END IF;

  IF _touch_responsible THEN
    IF NOT public.can_team('reservations.assign') THEN
      RAISE EXCEPTION 'Você não possui permissão para definir responsáveis.';
    END IF;
    PERFORM private.assert_team_member_of_agency(_responsible);
  END IF;

  UPDATE public.travel_file_services s
     SET status = COALESCE(_status, s.status),
         reconfirmed_amount = CASE WHEN _touch_financials THEN _reconfirmed_amount ELSE s.reconfirmed_amount END,
         sold_amount = CASE WHEN _touch_financials THEN _sold_amount ELSE s.sold_amount END,
         cost_amount = CASE WHEN _touch_financials THEN _cost_amount ELSE s.cost_amount END,
         commission_amount = CASE WHEN _touch_financials THEN _commission_amount ELSE s.commission_amount END,
         responsible_team_member_id = CASE WHEN _touch_responsible THEN _responsible ELSE s.responsible_team_member_id END,
         updated_at = now()
   WHERE s.id = _svc.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_service_save(uuid, text, numeric, numeric, numeric, numeric, uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_service_save(uuid, text, numeric, numeric, numeric, numeric, uuid, boolean, boolean) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_set_responsibles(_file_id uuid, _commercial uuid DEFAULT NULL::uuid, _operations uuid DEFAULT NULL::uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _file public.travel_files;
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.assign');
  PERFORM private.assert_manual_file_gate(_file.origin);
  PERFORM private.assert_team_member_of_agency(_commercial);
  PERFORM private.assert_team_member_of_agency(_operations);

  UPDATE public.travel_files
     SET responsible_team_member_id = _commercial,
         operations_responsible_team_member_id = _operations,
         updated_at = now()
   WHERE id = _file.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_set_responsibles(uuid, uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_set_responsibles(uuid, uuid, uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_note_add(_file_id uuid, _body text, _author_name text DEFAULT NULL::text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _file public.travel_files;
  _clean text := NULLIF(btrim(COALESCE(_body, '')), '');
  _id uuid;
BEGIN
  _file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  PERFORM private.assert_manual_file_gate(_file.origin);
  IF _clean IS NULL THEN RAISE EXCEPTION 'Escreva a nota antes de salvar.'; END IF;

  INSERT INTO public.travel_file_notes (file_id, agency_id, author_user_id, author_team_member_id, author_name, body)
  VALUES (_file.id, _file.agency_id, auth.uid(), private.current_team_member_id(),
          NULLIF(btrim(COALESCE(_author_name, '')), ''), left(_clean, 4000))
  RETURNING id INTO _id;

  RETURN _id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_note_add(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_note_add(uuid, text, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.travel_file_note_delete(_note_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _note public.travel_file_notes;
  _file public.travel_files;
BEGIN
  SELECT * INTO _note FROM public.travel_file_notes WHERE id = _note_id;
  IF _note.id IS NULL THEN RAISE EXCEPTION 'Nota não encontrada.'; END IF;
  _file := private.assert_travel_file_access(_note.file_id, 'reservations.manage');
  PERFORM private.assert_manual_file_gate(_file.origin);
  IF _note.author_user_id IS DISTINCT FROM auth.uid() AND private.current_team_member_id() IS NOT NULL THEN
    RAISE EXCEPTION 'Somente o autor pode excluir esta nota.';
  END IF;
  DELETE FROM public.travel_file_notes WHERE id = _note.id;
END $$;

REVOKE ALL ON FUNCTION public.travel_file_note_delete(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_note_delete(uuid) TO authenticated, service_role;

-- 3) Cadastro PJ: elegibilidade comercial da área Clientes/CRM na gravação.
CREATE OR REPLACE FUNCTION public.agency_company_save(_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency uuid := private.reservations_agency_id();
  v_id uuid := NULLIF(_payload->>'company_id','')::uuid;
  v_name text := NULLIF(btrim(COALESCE(_payload->>'name','')), '');
  v_cnpj text := NULLIF(regexp_replace(COALESCE(_payload->>'cnpj',''), '\D', '', 'g'), '');
  v_contact uuid := NULLIF(_payload->>'contact_client_id','')::uuid;
BEGIN
  -- Gravação exige a mesma elegibilidade comercial da área de Clientes/CRM
  -- usada por este cadastro. Leitura/busca de cadastros históricos continua
  -- liberada pelas permissões, sem depender do plano.
  IF NOT public.can_use_reservations_center() THEN
    RAISE EXCEPTION 'O cadastro de empresas não está disponível no seu plano atual.';
  END IF;

  IF v_name IS NULL THEN RAISE EXCEPTION 'Informe o nome da empresa.'; END IF;
  IF v_cnpj IS NOT NULL AND length(v_cnpj) <> 14 THEN
    RAISE EXCEPTION 'O CNPJ deve ter 14 números.';
  END IF;

  IF v_id IS NULL THEN
    IF NOT public.can_team('clients.create') THEN
      RAISE EXCEPTION 'Você não possui permissão para cadastrar empresas.';
    END IF;
    INSERT INTO public.companies (user_id, name, trade_name, cnpj_normalized, email, phone, notes)
    VALUES (v_agency, v_name,
            NULLIF(btrim(COALESCE(_payload->>'trade_name','')), ''), v_cnpj,
            NULLIF(btrim(COALESCE(_payload->>'email','')), ''),
            NULLIF(btrim(COALESCE(_payload->>'phone','')), ''),
            NULLIF(btrim(COALESCE(_payload->>'notes','')), ''))
    RETURNING id INTO v_id;
  ELSE
    IF NOT public.can_team('clients.edit') THEN
      RAISE EXCEPTION 'Você não possui permissão para alterar empresas.';
    END IF;
    UPDATE public.companies co
       SET name = v_name,
           trade_name = NULLIF(btrim(COALESCE(_payload->>'trade_name','')), ''),
           cnpj_normalized = v_cnpj,
           email = NULLIF(btrim(COALESCE(_payload->>'email','')), ''),
           phone = NULLIF(btrim(COALESCE(_payload->>'phone','')), ''),
           notes = COALESCE(NULLIF(btrim(COALESCE(_payload->>'notes','')), ''), co.notes),
           updated_at = now()
     WHERE co.id = v_id AND co.user_id = v_agency;
    IF NOT FOUND THEN RAISE EXCEPTION 'Empresa não encontrada nesta agência.'; END IF;
  END IF;

  IF v_contact IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM public.clients c WHERE c.id = v_contact AND c.user_id = v_agency) THEN
      RAISE EXCEPTION 'Contato responsável não encontrado nesta agência.';
    END IF;
    INSERT INTO public.client_companies (user_id, client_id, company_id, relationship_type, is_primary)
    SELECT v_agency, v_contact, v_id, 'contact', true
     WHERE NOT EXISTS (
       SELECT 1 FROM public.client_companies cc
        WHERE cc.client_id = v_contact AND cc.company_id = v_id);
  END IF;

  RETURN v_id;
END $$;

REVOKE ALL ON FUNCTION public.agency_company_save(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.agency_company_save(jsonb) TO authenticated, service_role;