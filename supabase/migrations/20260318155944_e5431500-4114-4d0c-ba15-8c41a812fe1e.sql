CREATE OR REPLACE FUNCTION public.verify_trip_access_by_slug(p_slug text, p_password text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  trip_record RECORD;
  services_data json;
  agent_profile json;
BEGIN
  IF p_slug IS NULL OR length(p_slug) < 3 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;
  SELECT * INTO trip_record FROM public.trips WHERE slug = p_slug;
  IF trip_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada');
  END IF;
  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    RETURN json_build_object('error', 'Senha incorreta');
  END IF;
  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.trip_services s WHERE s.trip_id = trip_record.id;
  SELECT json_build_object(
    'name', p.name, 'phone', p.phone, 'avatar_url', p.avatar_url,
    'agency_name', p.agency_name, 'agency_logo_url', p.agency_logo_url,
    'city', p.city, 'state', p.state
  ) INTO agent_profile FROM public.profiles p WHERE p.user_id = trip_record.user_id;
  RETURN json_build_object(
    'trip', json_build_object(
      'id', trip_record.id, 'client_name', trip_record.client_name,
      'destination', trip_record.destination, 'start_date', trip_record.start_date,
      'end_date', trip_record.end_date, 'status', trip_record.status,
      'created_at', trip_record.created_at, 'share_token', trip_record.share_token,
      'slug', trip_record.slug
    ),
    'services', COALESCE(services_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$$;