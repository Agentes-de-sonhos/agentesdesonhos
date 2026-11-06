-- Reproduce the reported gate failure before changing the shared rule.
DO $$
BEGIN
  IF public.agency_can_use_booking_requests('be17e92f-03d7-4f17-acf2-e2ab4d135edb'::uuid) THEN
    RAISE EXCEPTION 'Precondition failed: founder already eligible';
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.booking_request_plan_eligible(_plan text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public
AS $$ SELECT COALESCE(_plan IN ('premium', 'fundador'), false); $$;
REVOKE ALL ON FUNCTION public.booking_request_plan_eligible(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.booking_request_plan_eligible(text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.agency_can_use_booking_requests(_agency_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT _agency_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.user_id = _agency_id
        AND s.is_active
        AND public.booking_request_plan_eligible(s.plan::text)
        AND (s.expires_at IS NULL OR s.expires_at > now())
    )
    AND EXISTS (
      SELECT 1 FROM public.agency_public_domains d
      WHERE d.user_id = _agency_id AND d.is_active
    );
$$;

-- Preserve the admin/caller checks and existing response fields verbatim.
DO $$
DECLARE v_definition text;
BEGIN
  SELECT pg_get_functiondef('public.admin_whitelabel_status(uuid)'::regprocedure) INTO v_definition;
  IF position('''is_premium'', v_sub.plan = ''premium'',' in v_definition) = 0 THEN
    RAISE EXCEPTION 'Unexpected admin status definition';
  END IF;
  v_definition := replace(v_definition,
    '''is_premium'', v_sub.plan = ''premium'',',
    '''is_premium'', v_sub.plan = ''premium'',
    ''is_booking_plan_eligible'', public.booking_request_plan_eligible(v_sub.plan),');
  EXECUTE v_definition;
END $$;

-- Behavior regressions: each concrete plan and the same real agency gate.
DO $$
BEGIN
  IF NOT public.booking_request_plan_eligible('fundador') THEN RAISE EXCEPTION 'Fundador must qualify'; END IF;
  IF NOT public.booking_request_plan_eligible('premium') THEN RAISE EXCEPTION 'Premium must still qualify'; END IF;
  IF public.booking_request_plan_eligible('start') THEN RAISE EXCEPTION 'Start must remain excluded'; END IF;
  IF public.booking_request_plan_eligible('profissional') THEN RAISE EXCEPTION 'Profissional must remain excluded'; END IF;
  IF public.booking_request_plan_eligible(NULL) THEN RAISE EXCEPTION 'Null plan must fail closed'; END IF;
  IF NOT public.agency_can_use_booking_requests('be17e92f-03d7-4f17-acf2-e2ab4d135edb'::uuid) THEN RAISE EXCEPTION 'Curti founder gate must now pass'; END IF;
  IF public.agency_can_use_booking_requests(NULL) THEN RAISE EXCEPTION 'Null agency must fail closed'; END IF;
END $$;