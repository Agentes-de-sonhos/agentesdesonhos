ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS wallet_cover_url text;

CREATE OR REPLACE FUNCTION public.verify_trip_access(p_token text, p_password text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  trip_record RECORD;
  services_data json;
  agent_profile json;
BEGIN
  IF p_token IS NULL OR length(p_token) < 32 THEN
    RETURN json_build_object('error', 'Token inválido');
  END IF;
  SELECT * INTO trip_record FROM public.trips
  WHERE share_token = p_token AND (share_expires_at IS NULL OR share_expires_at > now());
  IF trip_record IS NULL THEN
    RETURN json_build_object('error', 'Carteira não encontrada ou link expirado');
  END IF;
  IF trip_record.is_locked = true THEN
    RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
  END IF;
  IF trip_record.access_password IS NOT NULL AND trip_record.access_password != p_password THEN
    IF p_password IS NULL OR length(p_password) = 0 THEN
      RETURN json_build_object('error', 'Senha inválida');
    END IF;
    UPDATE public.trips
    SET failed_password_attempts = failed_password_attempts + 1,
        is_locked = CASE WHEN failed_password_attempts + 1 >= 5 THEN true ELSE false END
    WHERE id = trip_record.id;
    IF trip_record.failed_password_attempts + 1 >= 5 THEN
      RETURN json_build_object('error', 'Acesso bloqueado por segurança. Entre em contato com a agência responsável.');
    END IF;
    RETURN json_build_object('error', 'Senha inválida');
  END IF;
  IF trip_record.failed_password_attempts > 0 THEN
    UPDATE public.trips SET failed_password_attempts = 0 WHERE id = trip_record.id;
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
      'trip_title', trip_record.trip_title,
      'destination', trip_record.destination, 'start_date', trip_record.start_date,
      'end_date', trip_record.end_date, 'status', trip_record.status,
      'created_at', trip_record.created_at,
      'share_token', trip_record.share_token,
      'slug', trip_record.slug,
      'public_access_code', trip_record.public_access_code,
      'itinerary_id', trip_record.itinerary_id,
      'itinerary_mode', trip_record.itinerary_mode,
      'wallet_cover_url', trip_record.wallet_cover_url,
      'has_password', (trip_record.access_password IS NOT NULL)
    ),
    'services', COALESCE(services_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$function$;