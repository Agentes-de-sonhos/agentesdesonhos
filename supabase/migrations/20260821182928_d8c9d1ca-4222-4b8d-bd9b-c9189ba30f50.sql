-- Seções estruturadas do orçamento: metadados OPCIONAIS e retrocompatíveis.
-- NULL em todos os campos = "Grupo livre" (comportamento atual, sem backfill).
ALTER TABLE public.quote_sections
  ADD COLUMN IF NOT EXISTS destination text NULL,
  ADD COLUMN IF NOT EXISTS start_date date NULL,
  ADD COLUMN IF NOT EXISTS end_date date NULL,
  ADD COLUMN IF NOT EXISTS service_type text NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.quote_sections'::regclass
      AND conname = 'quote_sections_service_type_check'
  ) THEN
    ALTER TABLE public.quote_sections
      ADD CONSTRAINT quote_sections_service_type_check
      CHECK (
        service_type IS NULL OR service_type = ANY (ARRAY[
          'flight','hotel','car_rental','transfer','attraction',
          'insurance','cruise','rail_transport','circuit','other'
        ])
      );
  END IF;
END;
$$;

-- Projeção pública: expõe apenas os novos campos de apresentação das seções.
CREATE OR REPLACE FUNCTION public.build_public_quote_payload(p_quote quotes)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  agent_record RECORD;
  services_data json;
  sections_data json;
  groups_data json;
  extras_data json;
  quote_json jsonb;
  v_agency uuid;
  v_booking_enabled boolean := false;
BEGIN
  SELECT * INTO agent_record FROM public.profiles WHERE user_id = p_quote.user_id;
  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.quote_services s WHERE s.quote_id = p_quote.id;

  SELECT json_agg(json_build_object(
    'id', sec.id, 'quote_id', sec.quote_id,
    'title', sec.title, 'order_index', sec.order_index,
    'destination', sec.destination,
    'start_date', sec.start_date,
    'end_date', sec.end_date,
    'service_type', sec.service_type
  ) ORDER BY sec.order_index) INTO sections_data
  FROM public.quote_sections sec WHERE sec.quote_id = p_quote.id;

  SELECT json_agg(json_build_object(
    'id', g.id, 'title', g.title, 'group_type', g.group_type,
    'min_select', g.min_select, 'max_select', g.max_select,
    'order_index', g.order_index
  ) ORDER BY g.order_index) INTO groups_data
  FROM public.quote_service_choice_groups g WHERE g.quote_id = p_quote.id;

  SELECT json_agg(row_to_json(e) ORDER BY e.sort_order) INTO extras_data
  FROM public.quote_entry_extras e WHERE e.quote_id = p_quote.id;

  IF COALESCE(p_quote.booking_requests_enabled, false) THEN
    v_agency := public.resolve_agency_id_for_user(p_quote.user_id);
    v_booking_enabled := public.agency_can_use_booking_requests(v_agency);
  END IF;

  -- Nunca expor token de compartilhamento nem ids internos ao navegador.
  quote_json := (to_jsonb(p_quote) - 'client_id' - 'share_token' - 'user_id')
    || jsonb_build_object(
         'booking_requests_enabled', v_booking_enabled,
         'has_linked_client', p_quote.client_id IS NOT NULL
       );

  RETURN json_build_object(
    'quote', quote_json,
    'services', COALESCE(services_data, '[]'::json),
    'sections', COALESCE(sections_data, '[]'::json),
    'choice_groups', COALESCE(groups_data, '[]'::json),
    'entry_extras', COALESCE(extras_data, '[]'::json),
    'agent_profile', json_build_object(
      'name', agent_record.name, 'phone', agent_record.phone,
      'avatar_url', agent_record.avatar_url,
      'agency_name', agent_record.agency_name,
      'agency_logo_url', agent_record.agency_logo_url,
      'city', agent_record.city, 'state', agent_record.state
    )
  );
END;
$function$;

-- Link legado por share_token também devolve os metadados opcionais.
DROP FUNCTION IF EXISTS public.get_quote_sections_by_share_token(text);
CREATE OR REPLACE FUNCTION public.get_quote_sections_by_share_token(p_share_token text)
 RETURNS TABLE(id uuid, quote_id uuid, title text, order_index integer,
               destination text, start_date date, end_date date, service_type text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT s.id, s.quote_id, s.title, s.order_index,
         s.destination, s.start_date, s.end_date, s.service_type
  FROM public.quote_sections s
  JOIN public.quotes q ON q.id = s.quote_id
  WHERE p_share_token IS NOT NULL
    AND length(p_share_token) >= 32
    AND q.share_token = p_share_token
    AND q.status = 'published'
    AND (q.share_expires_at IS NULL OR q.share_expires_at > now())
  ORDER BY s.order_index ASC;
$function$;