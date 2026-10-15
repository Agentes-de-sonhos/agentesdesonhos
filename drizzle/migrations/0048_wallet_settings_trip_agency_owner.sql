CREATE OR REPLACE FUNCTION public.wallet_agency_owner(_uid uuid)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT COALESCE(
    (SELECT am.agency_id FROM public.agency_membership am WHERE am.user_id = _uid LIMIT 1),
    (SELECT m.agency_id FROM public.agency_team_members m WHERE m.auth_user_id = _uid LIMIT 1),
    _uid)
$$;
REVOKE ALL ON FUNCTION public.wallet_agency_owner(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_trip_wallet_settings(_trip_id uuid)
RETURNS TABLE(show_calendar boolean, show_next_service boolean, show_next_activity boolean, show_support_tools boolean, show_signature boolean, show_whatsapp boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT
    COALESCE((m->>'show_calendar')::boolean,      a.show_calendar),
    COALESCE((m->>'show_next_service')::boolean,  a.show_next_service),
    COALESCE((m->>'show_next_activity')::boolean, a.show_next_activity),
    COALESCE((m->>'show_support_tools')::boolean, a.show_support_tools),
    COALESCE((m->>'show_signature')::boolean,     a.show_signature),
    COALESCE((m->>'show_whatsapp')::boolean,      a.show_whatsapp)
  FROM (SELECT t.user_id, CASE WHEN jsonb_typeof(t.wallet_modules) = 'object' THEN t.wallet_modules ELSE '{}'::jsonb END AS m
        FROM public.trips t WHERE t.id = _trip_id) t
  CROSS JOIN LATERAL public.get_agency_wallet_settings(public.wallet_agency_owner(t.user_id)) a;
$$;
REVOKE ALL ON FUNCTION public.get_trip_wallet_settings(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_trip_agency_wallet_defaults(_trip_id uuid)
RETURNS TABLE(show_calendar boolean, show_next_service boolean, show_next_activity boolean, show_support_tools boolean, show_signature boolean, show_whatsapp boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT a.*
  FROM public.trips t
  CROSS JOIN LATERAL public.get_agency_wallet_settings(public.wallet_agency_owner(t.user_id)) a
  WHERE t.id = _trip_id
    AND auth.uid() IS NOT NULL
    AND public.wallet_agency_owner(auth.uid()) = public.wallet_agency_owner(t.user_id);
$$;
REVOKE ALL ON FUNCTION public.get_trip_agency_wallet_defaults(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_trip_agency_wallet_defaults(uuid) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_agency_wallet_settings(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_agency_wallet_settings(uuid) TO authenticated;