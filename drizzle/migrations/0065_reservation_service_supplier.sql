-- Operational supplier identity must remain editable when a sale is converted.
-- Do not reopen or alter the financial-rule snapshots, sale or operation values.
CREATE OR REPLACE FUNCTION public.travel_file_service_set_supplier(
  _service_id uuid,
  _operator_id uuid DEFAULT NULL,
  _supplier_name text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _service public.travel_file_services;
  _file public.travel_files;
BEGIN
  SELECT * INTO _service FROM public.travel_file_services WHERE id = _service_id FOR UPDATE;
  IF _service.id IS NULL THEN RAISE EXCEPTION 'SERVICE_NOT_FOUND'; END IF;
  _file := private.assert_travel_file_access(_service.file_id, 'reservations.manage');
  PERFORM private.assert_travel_file_access(_service.file_id, 'reservations.financial.manage');
  PERFORM private.assert_manual_file_gate(_file.origin);
  IF NOT public.agency_has_entitlement(_file.agency_id, 'unified_workflow_v2') THEN
    RAISE EXCEPTION 'UNIFIED_WORKFLOW_DISABLED: O fluxo unificado de venda não está ativo para esta agência.';
  END IF;
  -- SECURITY DEFINER bypasses tour_operators RLS: reuse the reservations
  -- supplier gate (approved global catalog or this reservation's own agency).
  IF _operator_id IS NOT NULL AND NOT private.reservations_supplier_allowed(
    _operator_id, ARRAY[_file.agency_id]
  ) THEN RAISE EXCEPTION 'Fornecedor não disponível para esta agência.'; END IF;
  _supplier_name := nullif(btrim(_supplier_name), '');
  IF _operator_id IS NULL AND _supplier_name IS NULL THEN
    RAISE EXCEPTION 'Informe o fornecedor.';
  END IF;

  UPDATE public.travel_file_services
  SET operator_id = _operator_id, supplier_name = _supplier_name, updated_at = now()
  WHERE id = _service_id;

  INSERT INTO public.travel_file_events (file_id, agency_id, event_type, actor_user_id, payload)
  VALUES (_service.file_id, _file.agency_id, 'service_supplier_set', auth.uid(),
    jsonb_build_object('service_id', _service_id, 'operator_id', _operator_id,
      'supplier_name', _supplier_name));
END;
$function$;
REVOKE ALL ON FUNCTION public.travel_file_service_set_supplier(uuid,uuid,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.travel_file_service_set_supplier(uuid,uuid,text) TO authenticated;
