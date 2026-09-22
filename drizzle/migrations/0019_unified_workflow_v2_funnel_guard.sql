-- Fase 1A (complemento da 2ª rodada corretiva).
-- Guard do funil no servidor: com o fluxo unificado ativo, o fechamento de uma
-- oportunidade que tem processo de reserva só pode acontecer pelo caminho da
-- RPC confirm_travel_file_sale. A verificação passa a ocorrer ANTES de qualquer
-- reuso/retorno do caminho legado.
-- Sem o entitlement, o comportamento legado é idêntico ao atual.

CREATE OR REPLACE FUNCTION public.auto_create_operation_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
  existing_op RECORD;
  op_title TEXT;
  new_legacy TEXT;
  old_legacy TEXT;
  is_now_closed BOOLEAN := false;
  was_closed BOOLEAN := false;
  _v2 BOOLEAN := false;
  _file_count INT := 0;
  _linked_ok BOOLEAN := false;
  _foreign_link BOOLEAN := false;
BEGIN
  IF NEW.stage_id IS NOT NULL THEN
    SELECT legacy_key INTO new_legacy FROM public.pipeline_stages WHERE id = NEW.stage_id;
  END IF;
  new_legacy := COALESCE(new_legacy, NEW.stage);

  IF TG_OP = 'UPDATE' THEN
    IF OLD.stage_id IS NOT NULL THEN
      SELECT legacy_key INTO old_legacy FROM public.pipeline_stages WHERE id = OLD.stage_id;
    END IF;
    old_legacy := COALESCE(old_legacy, OLD.stage);
    was_closed := (old_legacy = 'closed');
  END IF;

  is_now_closed := (new_legacy = 'closed');

  IF is_now_closed AND NOT was_closed THEN
    -- ============================================================
    -- GUARD V2 PRIMEIRO: antes de qualquer reuso legado.
    -- ============================================================
    _v2 := public.agency_has_entitlement(NEW.user_id, 'unified_workflow_v2');

    IF _v2 THEN
      SELECT count(*) INTO _file_count
      FROM public.travel_files tf
      WHERE tf.opportunity_id = NEW.id
        AND tf.status <> 'cancelled';

      IF _file_count > 0 THEN
        -- Fechamento aceito somente quando existe operação inequivocamente
        -- ligada a um file desta oportunidade (criada pela RPC).
        SELECT EXISTS (
          SELECT 1
          FROM public.operations o
          JOIN public.travel_files tf ON tf.id = o.travel_file_id
          WHERE o.opportunity_id = NEW.id
            AND tf.opportunity_id = NEW.id
            AND tf.status <> 'cancelled'
            AND o.conversion_key = 'file:' || o.travel_file_id::text
        ) INTO _linked_ok;

        IF NOT _linked_ok THEN
          SELECT EXISTS (
            SELECT 1
            FROM public.operations o
            WHERE o.opportunity_id = NEW.id
              AND o.travel_file_id IS NOT NULL
              AND NOT EXISTS (
                SELECT 1 FROM public.travel_files tf
                WHERE tf.id = o.travel_file_id
                  AND tf.opportunity_id = NEW.id
              )
          ) INTO _foreign_link;

          IF _foreign_link THEN
            RAISE EXCEPTION 'WORKFLOW_LINK_CONFLICT: Esta oportunidade já está ligada a outro processo de reserva. Revise os vínculos na Central de Reservas antes de confirmar a venda.';
          END IF;

          RAISE EXCEPTION 'USE_CONFIRM_SALE: Esta oportunidade tem um processo de reserva. Confirme a venda pela Central de Reservas, no botão "Confirmar venda e iniciar operação".';
        END IF;

        -- Operação canônica do file já existe (caminho da RPC): nada a criar e
        -- nenhuma importação legada de serviços.
        RETURN NEW;
      END IF;
    END IF;

    -- ============================================================
    -- Caminho legado (sem entitlement ou sem processo de reserva).
    -- ============================================================
    SELECT id, travel_file_id INTO existing_op FROM public.operations WHERE opportunity_id = NEW.id LIMIT 1;
    IF existing_op.id IS NOT NULL THEN
      IF existing_op.travel_file_id IS NULL THEN
        PERFORM public.import_booking_request_into_operation(existing_op.id);
      END IF;
      RETURN NEW;
    END IF;

    SELECT name INTO client_record FROM public.clients WHERE id = NEW.client_id;
    op_title := COALESCE(NEW.destination, 'Viagem') || ' - ' || COALESCE(client_record.name, 'Cliente');

    INSERT INTO public.operations (
      user_id, client_id, opportunity_id, title, destination,
      travel_start_date, travel_end_date, passengers_count, sale_amount,
      stage, payment_status, position, conversion_key, flow_origin
    ) VALUES (
      NEW.user_id, NEW.client_id, NEW.id, op_title, NEW.destination,
      NEW.start_date, NEW.end_date, NEW.passengers_count, NEW.estimated_value,
      'venda_confirmada', 'pendente', 0,
      'opportunity:' || NEW.id::text, 'legacy_close'
    );
  END IF;

  RETURN NEW;
END;
$function$;