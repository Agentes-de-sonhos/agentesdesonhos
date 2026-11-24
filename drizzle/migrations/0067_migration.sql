CREATE OR REPLACE FUNCTION public.agency_can_use_booking_requests(_agency_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  -- Liberado para todas as agências (sem exigir plano Premium nem site White Label).
  SELECT _agency_id IS NOT NULL;
$function$;

CREATE OR REPLACE FUNCTION public.enforce_quote_booking_entitlement()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.agency_can_use_booking_requests(public.resolve_agency_id_for_user(NEW.user_id)) THEN
    NEW.booking_requests_enabled := false;
    RETURN NEW;
  END IF;
  -- Novos orçamentos: ligado por padrão. Edições: respeita a escolha da agência.
  IF TG_OP = 'INSERT' THEN
    NEW.booking_requests_enabled := true;
  END IF;
  RETURN NEW;
END;
$function$;