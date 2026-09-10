CREATE OR REPLACE FUNCTION private.travel_file_update_manual_apply(_file_id uuid, _payload jsonb)
RETURNS void
LANGUAGE plpgsql
VOLATILE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_file public.travel_files;
  v_agency uuid;
  v_client uuid;
  v_company uuid;
  v_contact uuid;
  v_type text;
  v_trip text;
  v_dest text;
  v_start date;
  v_end date;
  v_currency text;
  v_adults integer;
  v_children integer;
  v_amount numeric;
  v_snapshot jsonb;
BEGIN
  v_file := private.assert_travel_file_access(_file_id, 'reservations.manage');
  v_agency := v_file.agency_id;

  IF v_file.origin <> 'manual' THEN
    RAISE EXCEPTION 'Esta reserva veio da solicitação do site e não pode ser editada aqui.';
  END IF;

  -- Atualização parcial: chave ausente preserva o valor atual.
  v_type := CASE WHEN _payload ? 'contractor_type'
                 THEN COALESCE(NULLIF(_payload->>'contractor_type',''), 'individual')
                 ELSE COALESCE(v_file.contractor_type, 'individual') END;
  v_client := CASE WHEN _payload ? 'client_id'
                   THEN NULLIF(_payload->>'client_id','')::uuid ELSE v_file.client_id END;
  v_company := CASE WHEN _payload ? 'company_id'
                    THEN NULLIF(_payload->>'company_id','')::uuid ELSE v_file.company_id END;
  v_contact := CASE WHEN _payload ? 'contact_client_id'
                    THEN NULLIF(_payload->>'contact_client_id','')::uuid ELSE v_file.contact_client_id END;
  v_trip := CASE WHEN _payload ? 'trip_name'
                 THEN NULLIF(btrim(COALESCE(_payload->>'trip_name','')), '')
                 ELSE v_file.trip_name END;
  v_dest := CASE WHEN _payload ? 'primary_destination'
                 THEN NULLIF(btrim(COALESCE(_payload->>'primary_destination','')), '')
                 ELSE v_file.primary_destination END;
  v_start := CASE WHEN _payload ? 'start_date'
                  THEN NULLIF(_payload->>'start_date','')::date ELSE v_file.start_date END;
  v_end := CASE WHEN _payload ? 'end_date'
                THEN NULLIF(_payload->>'end_date','')::date ELSE v_file.end_date END;

  IF v_type NOT IN ('individual','company') THEN
    RAISE EXCEPTION 'Informe se o contratante é pessoa física ou empresa.';
  END IF;

  IF v_type = 'company' THEN
    IF v_company IS NULL THEN RAISE EXCEPTION 'Selecione a empresa contratante.'; END IF;
    v_client := NULL;
  ELSE
    IF v_client IS NULL THEN RAISE EXCEPTION 'Selecione o cliente contratante.'; END IF;
    v_company := NULL;
  END IF;

  IF v_trip IS NULL AND v_dest IS NULL THEN
    RAISE EXCEPTION 'Informe o nome da viagem ou o destino.';
  END IF;

  PERFORM private.reservations_check_dates(v_start, v_end);

  IF v_client IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = v_client AND c.user_id = v_agency) THEN
    RAISE EXCEPTION 'Cliente não encontrado nesta agência.';
  END IF;
  IF v_company IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.companies co WHERE co.id = v_company AND co.user_id = v_agency) THEN
    RAISE EXCEPTION 'Empresa não encontrada nesta agência.';
  END IF;
  IF v_contact IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.clients c WHERE c.id = v_contact AND c.user_id = v_agency) THEN
    RAISE EXCEPTION 'Contato responsável não encontrado nesta agência.';
  END IF;

  v_currency := CASE WHEN _payload ? 'currency'
                     THEN private.reservations_currency(_payload->>'currency', v_file.currency)
                     ELSE v_file.currency END;
  v_adults := COALESCE(private.reservations_count(_payload, 'adults_count', COALESCE(v_file.adults_count, 0)), 0);
  v_children := COALESCE(private.reservations_count(_payload, 'children_count', COALESCE(v_file.children_count, 0)), 0);

  v_amount := CASE WHEN _payload ? 'requested_amount' AND public.can_team('reservations.financial.manage')
                   THEN COALESCE(private.reservations_amount(_payload, 'requested_amount'),
                                 COALESCE(v_file.requested_amount, 0))
                   ELSE COALESCE(v_file.requested_amount, 0) END;

  -- Contato escrito à mão: só é regravado quando a tela enviou algum campo dele.
  v_snapshot := COALESCE(v_file.contact_snapshot, '{}'::jsonb);
  IF (_payload ? 'contact_name') OR (_payload ? 'contact_email') OR (_payload ? 'contact_phone') THEN
    v_snapshot := jsonb_strip_nulls(jsonb_build_object(
      'name', CASE WHEN _payload ? 'contact_name'
                   THEN NULLIF(btrim(COALESCE(_payload->>'contact_name','')), '')
                   ELSE NULLIF(btrim(COALESCE(v_snapshot->>'name','')), '') END,
      'email', CASE WHEN _payload ? 'contact_email'
                    THEN NULLIF(btrim(COALESCE(_payload->>'contact_email','')), '')
                    ELSE NULLIF(btrim(COALESCE(v_snapshot->>'email','')), '') END,
      'phone', CASE WHEN _payload ? 'contact_phone'
                    THEN NULLIF(btrim(COALESCE(_payload->>'contact_phone','')), '')
                    ELSE NULLIF(btrim(COALESCE(v_snapshot->>'phone','')), '') END
    ));
  END IF;

  UPDATE public.travel_files f
     SET contractor_type = v_type,
         client_id = v_client,
         company_id = v_company,
         contact_client_id = v_contact,
         contact_snapshot = v_snapshot,
         trip_name = v_trip,
         primary_destination = v_dest,
         destinations = CASE WHEN v_dest IS NULL THEN '{}'::text[] ELSE ARRAY[v_dest] END,
         start_date = v_start,
         end_date = v_end,
         adults_count = v_adults,
         children_count = v_children,
         passengers_count = v_adults + v_children,
         currency = v_currency,
         requested_amount = v_amount,
         updated_at = now()
   WHERE f.id = v_file.id;
END $$;

REVOKE ALL ON FUNCTION private.travel_file_update_manual_apply(uuid, jsonb) FROM PUBLIC, anon;