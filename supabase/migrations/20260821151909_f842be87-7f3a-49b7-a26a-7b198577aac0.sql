-- 1) Helper: projeção pública segura de um orçamento (sem token nem ids internos)
CREATE OR REPLACE FUNCTION public.build_public_quote_payload(p_quote public.quotes)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
    'title', sec.title, 'order_index', sec.order_index
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

REVOKE ALL ON FUNCTION public.build_public_quote_payload(public.quotes) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.build_public_quote_payload(public.quotes) TO service_role;

-- 2) Leitura pública por código (domínio/white label) — mantém validação de slug
CREATE OR REPLACE FUNCTION public.get_quote_by_public_code(p_agency_slug text, p_code text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record public.quotes;
BEGIN
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO quote_record
  FROM public.quotes
  WHERE public_access_code = p_code AND status = 'published';

  IF quote_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  IF NOT public.agency_public_slug_matches(quote_record.user_id, p_agency_slug) THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  RETURN public.build_public_quote_payload(quote_record);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_quote_by_public_code(text, text) TO anon, authenticated, service_role;

-- 3) Leitura pública por share_token (links legados /orcamento/:token)
CREATE OR REPLACE FUNCTION public.get_quote_by_share_token(p_share_token text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  quote_record public.quotes;
BEGIN
  IF p_share_token IS NULL OR length(p_share_token) < 32 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO quote_record
  FROM public.quotes
  WHERE share_token = p_share_token
    AND status = 'published'
    AND (share_expires_at IS NULL OR share_expires_at > now());

  IF quote_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  RETURN public.build_public_quote_payload(quote_record);
END;
$function$;

GRANT EXECUTE ON FUNCTION public.get_quote_by_share_token(text) TO anon, authenticated, service_role;

-- 4) Documentos públicos do orçamento (mesma semântica da política anterior)
CREATE OR REPLACE FUNCTION public.get_public_quote_documents(p_quote_id uuid)
RETURNS TABLE(id uuid, file_name text, file_path text, file_type text, file_size bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.id, d.file_name, d.file_path, d.file_type, d.file_size::bigint
  FROM public.quote_documents d
  JOIN public.quotes q ON q.id = d.quote_id
  WHERE d.quote_id = p_quote_id
    AND d.is_public = true
    AND q.status = 'published'
  ORDER BY d.created_at ASC
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_quote_documents(uuid) TO anon, authenticated, service_role;

-- 5) Fecha a enumeração anônima: remove políticas permissivas e o acesso direto do papel anon
DROP POLICY IF EXISTS "Public can view published quotes with valid token" ON public.quotes;
DROP POLICY IF EXISTS "Public can view services of published quotes with valid token" ON public.quote_services;
DROP POLICY IF EXISTS "Public can view entry extras of accessible quotes" ON public.quote_entry_extras;
DROP POLICY IF EXISTS "Public can view shared documents of published quotes" ON public.quote_documents;

REVOKE ALL ON TABLE public.quotes FROM anon;
REVOKE ALL ON TABLE public.quote_services FROM anon;
REVOKE ALL ON TABLE public.quote_entry_extras FROM anon;
REVOKE ALL ON TABLE public.quote_documents FROM anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quotes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_services TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_entry_extras TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_documents TO authenticated;
GRANT ALL ON public.quotes TO service_role;
GRANT ALL ON public.quote_services TO service_role;
GRANT ALL ON public.quote_entry_extras TO service_role;
GRANT ALL ON public.quote_documents TO service_role;