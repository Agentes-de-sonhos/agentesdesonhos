ALTER TABLE public.trips ADD COLUMN IF NOT EXISTS wallet_modules jsonb;
COMMENT ON COLUMN public.trips.wallet_modules IS 'Per-wallet explicit module overrides (only keys set by the agent); missing keys inherit agency settings, then system defaults.';

ALTER TABLE public.agency_wallet_settings ALTER COLUMN show_next_service SET DEFAULT false;
ALTER TABLE public.agency_wallet_settings ALTER COLUMN show_next_activity SET DEFAULT false;
ALTER TABLE public.agency_wallet_settings ALTER COLUMN show_support_tools SET DEFAULT false;

CREATE OR REPLACE FUNCTION public.get_agency_wallet_settings(_user_id uuid)
 RETURNS TABLE(show_calendar boolean, show_next_service boolean, show_next_activity boolean, show_support_tools boolean, show_signature boolean, show_whatsapp boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE(s.show_calendar,      true),
    COALESCE(s.show_next_service,  false),
    COALESCE(s.show_next_activity, false),
    COALESCE(s.show_support_tools, false),
    COALESCE(s.show_signature,     true),
    COALESCE(s.show_whatsapp,      true)
  FROM (SELECT _user_id AS uid) q
  LEFT JOIN public.agency_wallet_settings s ON s.user_id = q.uid;
$function$;

CREATE OR REPLACE FUNCTION public.get_trip_wallet_settings(_trip_id uuid)
 RETURNS TABLE(show_calendar boolean, show_next_service boolean, show_next_activity boolean, show_support_tools boolean, show_signature boolean, show_whatsapp boolean)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
  SELECT
    COALESCE((m->>'show_calendar')::boolean,      a.show_calendar),
    COALESCE((m->>'show_next_service')::boolean,  a.show_next_service),
    COALESCE((m->>'show_next_activity')::boolean, a.show_next_activity),
    COALESCE((m->>'show_support_tools')::boolean, a.show_support_tools),
    COALESCE((m->>'show_signature')::boolean,     a.show_signature),
    COALESCE((m->>'show_whatsapp')::boolean,      a.show_whatsapp)
  FROM (SELECT t.user_id, CASE WHEN jsonb_typeof(t.wallet_modules) = 'object' THEN t.wallet_modules ELSE '{}'::jsonb END AS m
        FROM public.trips t WHERE t.id = _trip_id) t
  CROSS JOIN LATERAL public.get_agency_wallet_settings(t.user_id) a;
$function$;
REVOKE ALL ON FUNCTION public.get_trip_wallet_settings(uuid) FROM PUBLIC, anon, authenticated;

DO $$
DECLARE fn text; def text;
BEGIN
  FOREACH fn IN ARRAY ARRAY['verify_trip_access_by_slug','verify_trip_by_public_code','get_trip_by_public_code','verify_trip_access'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO def FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn LIMIT 1;
    IF def IS NOT NULL AND position('get_agency_wallet_settings(trip_record.user_id)' IN def) > 0 THEN
      EXECUTE replace(def, 'get_agency_wallet_settings(trip_record.user_id)', 'get_trip_wallet_settings(trip_record.id)');
    END IF;
  END LOOP;
END $$;