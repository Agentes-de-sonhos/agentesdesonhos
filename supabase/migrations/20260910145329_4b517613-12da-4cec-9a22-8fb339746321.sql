-- Correção estreita: o gate comercial do cadastro PJ passa a ser o da área de
-- Clientes/CRM (plano/concessão da conta master), sem exigir reservations.view.
-- Nada mais é alterado: can_use_reservations_center, has_feature_access e as
-- políticas de companies/client_companies seguem intactos.
CREATE OR REPLACE FUNCTION public.agency_company_save(_payload jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_agency uuid := private.reservations_agency_id();
  v_id uuid := NULLIF(_payload->>'company_id','')::uuid;
  v_name text := NULLIF(btrim(COALESCE(_payload->>'name','')), '');
  v_cnpj text := NULLIF(regexp_replace(COALESCE(_payload->>'cnpj',''), '\D', '', 'g'), '');
  v_contact uuid := NULLIF(_payload->>'contact_client_id','')::uuid;
  v_member_id uuid;
  v_member_status public.team_member_status;
  v_eligible boolean;
BEGIN
  -- Vínculo ativo: colaborador inativo/bloqueado não grava.
  SELECT m.id, m.status INTO v_member_id, v_member_status
    FROM public.agency_team_members m
   WHERE m.auth_user_id = v_uid
   ORDER BY m.created_at
   LIMIT 1;
  IF v_member_id IS NOT NULL
     AND v_member_status IS DISTINCT FROM 'active'::public.team_member_status THEN
    RAISE EXCEPTION 'Seu acesso está inativo nesta agência.';
  END IF;

  -- Elegibilidade comercial da área de Clientes/CRM: administrador/promotor ou
  -- plano/concessão da conta master. NÃO exige permissão de Reservas.
  v_eligible := public.has_role(v_uid, 'admin'::public.app_role)
                OR public.has_role(v_uid, 'promotor'::public.app_role)
                OR private.reservations_owner_is_eligible(v_agency);
  IF NOT v_eligible THEN
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
END $function$;
