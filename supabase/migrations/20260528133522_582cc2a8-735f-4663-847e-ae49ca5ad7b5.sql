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
BEGIN
  IF NEW.stage = 'closed' AND (OLD.stage IS NULL OR OLD.stage <> 'closed') THEN
    SELECT id INTO existing_op_id
    FROM public.operations
    WHERE opportunity_id = NEW.id
    LIMIT 1;

    IF existing_op_id IS NOT NULL THEN
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
      'venda_confirmada', 'pago', 0
    );
  END IF;

  RETURN NEW;
END;
$function$;