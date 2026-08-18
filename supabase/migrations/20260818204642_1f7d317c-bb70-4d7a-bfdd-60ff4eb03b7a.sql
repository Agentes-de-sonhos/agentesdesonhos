CREATE OR REPLACE FUNCTION public.auto_create_operation_on_close()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
  existing_op_id UUID;
  op_title TEXT;
  new_legacy TEXT;
  old_legacy TEXT;
  is_now_closed BOOLEAN := false;
  was_closed BOOLEAN := false;
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
    SELECT id INTO existing_op_id FROM public.operations WHERE opportunity_id = NEW.id LIMIT 1;
    IF existing_op_id IS NOT NULL THEN
      -- Operacao reaproveitada: importa os servicos do pedido de reserva de forma
      -- idempotente (itens ja convertidos sao ignorados; pagamentos nao sao alterados).
      PERFORM public.import_booking_request_into_operation(existing_op_id);
      RETURN NEW;
    END IF;

    SELECT name INTO client_record FROM public.clients WHERE id = NEW.client_id;
    op_title := COALESCE(NEW.destination, 'Viagem') || ' - ' || COALESCE(client_record.name, 'Cliente');

    INSERT INTO public.operations (
      user_id, client_id, opportunity_id, title, destination,
      travel_start_date, travel_end_date, passengers_count, sale_amount,
      stage, payment_status, position
    ) VALUES (
      NEW.user_id, NEW.client_id, NEW.id, op_title, NEW.destination,
      NEW.start_date, NEW.end_date, NEW.passengers_count, NEW.estimated_value,
      'venda_confirmada', 'pendente', 0
    );
  END IF;

  RETURN NEW;
END;
$function$;