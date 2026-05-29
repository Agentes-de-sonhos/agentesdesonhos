
CREATE OR REPLACE FUNCTION public.admin_list_user_projects()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'trips', COALESCE((
      SELECT jsonb_agg(t ORDER BY t.created_at DESC)
      FROM (
        SELECT 
          tr.id, tr.user_id, tr.client_name, tr.trip_title, tr.destination,
          tr.start_date, tr.end_date, tr.status, tr.public_access_code,
          tr.access_password, tr.is_locked, tr.created_at, tr.updated_at,
          p.name AS owner_name, p.agency_name AS owner_agency
        FROM public.trips tr
        LEFT JOIN public.profiles p ON p.user_id = tr.user_id
      ) t
    ), '[]'::jsonb),
    'quotes', COALESCE((
      SELECT jsonb_agg(q ORDER BY q.created_at DESC)
      FROM (
        SELECT
          qu.id, qu.user_id, qu.client_name, qu.destination,
          qu.start_date, qu.end_date, qu.status, qu.public_access_code,
          qu.total_amount, qu.currency, qu.created_at, qu.updated_at,
          p.name AS owner_name, p.agency_name AS owner_agency
        FROM public.quotes qu
        LEFT JOIN public.profiles p ON p.user_id = qu.user_id
      ) q
    ), '[]'::jsonb),
    'itineraries', COALESCE((
      SELECT jsonb_agg(i ORDER BY i.created_at DESC)
      FROM (
        SELECT
          it.id, it.user_id, it.destination, it.start_date, it.end_date,
          it.status, it.public_access_code, it.travelers_count, it.trip_type,
          it.created_at, it.updated_at,
          p.name AS owner_name, p.agency_name AS owner_agency
        FROM public.itineraries it
        LEFT JOIN public.profiles p ON p.user_id = it.user_id
      ) i
    ), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_list_user_projects() TO authenticated;
