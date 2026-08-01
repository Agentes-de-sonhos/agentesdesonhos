-- 1) Target existence/availability validation (centralized, testable)
CREATE OR REPLACE FUNCTION public.supplier_review_target_exists(_source text, _supplier_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_ok boolean := false;
BEGIN
  IF _source IS NULL OR _supplier_id IS NULL OR btrim(_supplier_id) = '' THEN
    RETURN false;
  END IF;

  IF _source = 'operator' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tour_operators o
      WHERE o.id::text = _supplier_id
        AND coalesce(o.is_active, false)
        AND coalesce(o.approval_status, 'approved') = 'approved'
    ) INTO v_ok;
  ELSIF _source = 'supplier' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.trade_suppliers s
      WHERE s.id::text = _supplier_id AND coalesce(s.is_active, false)
    ) INTO v_ok;
  ELSIF _source = 'guide' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tour_guides g
      WHERE g.id::text = _supplier_id AND coalesce(g.status, '') = 'approved'
    ) INTO v_ok;
  ELSIF _source = 'cruise' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.companhias_maritimas c
      WHERE c.id::text = _supplier_id AND coalesce(c.ativo, false)
    ) INTO v_ok;
  ELSE
    -- 'travelmeet' e demais: dados externos, sem entidade local confiável
    v_ok := false;
  END IF;

  RETURN coalesce(v_ok, false);
END;
$function$;

-- 2) Stronger eligibility
CREATE OR REPLACE FUNCTION public.supplier_review_eligibility()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_confirmed timestamptz;
  v_name text;
  v_avatar text;
BEGIN
  IF v_uid IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'unauthenticated');
  END IF;

  SELECT u.email_confirmed_at INTO v_confirmed FROM auth.users u WHERE u.id = v_uid;
  IF v_confirmed IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'email_unconfirmed');
  END IF;

  SELECT NULLIF(btrim(coalesce(p.name, '')), ''), NULLIF(btrim(coalesce(p.avatar_url, '')), '')
    INTO v_name, v_avatar
  FROM public.profiles p WHERE p.user_id = v_uid;

  IF v_name IS NULL OR v_avatar IS NULL THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'incomplete_profile');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.agency_membership m WHERE m.user_id = v_uid) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'sem_vinculo_agencia');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = v_uid
      AND coalesce(s.is_active, false)
      AND (s.expires_at IS NULL OR s.expires_at > now())
  ) THEN
    RETURN jsonb_build_object('eligible', false, 'reason', 'sem_assinatura');
  END IF;

  RETURN jsonb_build_object('eligible', true, 'reason', 'ok');
END;
$function$;

-- 3) Correct self-review detection (agency membership aware)
CREATE OR REPLACE FUNCTION public.supplier_review_is_own_company(_source text, _supplier_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_own boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF _source = 'operator' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tour_operators o
      WHERE o.id::text = _supplier_id
        AND (
          o.user_id = v_uid
          OR (o.owner_agency_id IS NOT NULL AND EXISTS (
                SELECT 1 FROM public.agency_membership m
                WHERE m.user_id = v_uid AND m.agency_id = o.owner_agency_id
             ))
        )
    ) INTO v_own;
  ELSIF _source = 'guide' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tour_guides g
      WHERE g.id::text = _supplier_id AND g.user_id = v_uid
    ) INTO v_own;
  ELSE
    -- trade_suppliers e companhias_maritimas não possuem campo de propriedade confiável
    v_own := false;
  END IF;

  RETURN coalesce(v_own, false);
END;
$function$;

-- 4) Submit: validate the target before upsert
CREATE OR REPLACE FUNCTION public.submit_supplier_review(_source text, _supplier_id text, _rating smallint, _comment text DEFAULT NULL::text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_elig jsonb;
  v_comment text;
  v_status text;
  v_existing public.supplier_community_reviews;
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  v_elig := public.supplier_review_eligibility();
  IF NOT (v_elig->>'eligible')::boolean THEN
    RAISE EXCEPTION 'not_eligible:%', v_elig->>'reason';
  END IF;

  IF _source NOT IN ('operator','supplier','guide','cruise') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;
  IF _supplier_id IS NULL OR btrim(_supplier_id) = '' THEN
    RAISE EXCEPTION 'invalid_supplier';
  END IF;
  IF _rating IS NULL OR _rating < 3 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating';
  END IF;
  IF NOT public.supplier_review_target_exists(_source, _supplier_id) THEN
    RAISE EXCEPTION 'invalid_supplier';
  END IF;
  IF public.supplier_review_is_own_company(_source, _supplier_id) THEN
    RAISE EXCEPTION 'own_company';
  END IF;

  v_comment := NULLIF(btrim(coalesce(_comment, '')), '');
  IF _rating = 3 THEN
    v_comment := NULL;
  END IF;
  IF v_comment IS NOT NULL AND char_length(v_comment) > 500 THEN
    v_comment := left(v_comment, 500);
  END IF;

  SELECT * INTO v_existing
  FROM public.supplier_community_reviews
  WHERE supplier_source = _source AND supplier_id = _supplier_id AND user_id = v_uid
  FOR UPDATE;

  IF v_comment IS NULL THEN
    v_status := 'none';
  ELSIF v_existing.id IS NOT NULL
        AND v_existing.comment IS NOT NULL
        AND v_existing.comment = v_comment
        AND v_existing.comment_status IN ('approved','pending','rejected') THEN
    v_status := v_existing.comment_status;
  ELSE
    v_status := 'pending';
  END IF;

  IF v_existing.id IS NULL THEN
    INSERT INTO public.supplier_community_reviews
      (supplier_source, supplier_id, user_id, rating, comment, comment_status)
    VALUES (_source, _supplier_id, v_uid, _rating, v_comment, v_status)
    ON CONFLICT (supplier_source, supplier_id, user_id) DO UPDATE
      SET rating = EXCLUDED.rating,
          comment = EXCLUDED.comment,
          comment_status = EXCLUDED.comment_status
    RETURNING id INTO v_id;
  ELSE
    UPDATE public.supplier_community_reviews
      SET rating = _rating,
          comment = v_comment,
          comment_status = v_status,
          moderation_reason = CASE WHEN v_status = 'pending' THEN NULL ELSE moderation_reason END
    WHERE id = v_existing.id
    RETURNING id INTO v_id;
  END IF;

  RETURN jsonb_build_object('id', v_id, 'rating', _rating, 'comment_status', v_status);
END;
$function$;

-- 5) Data minimization: never expose third-party user_id
CREATE OR REPLACE FUNCTION public.get_supplier_reviews(_source text, _supplier_id text, _limit integer DEFAULT 50, _offset integer DEFAULT 0)
RETURNS TABLE(id uuid, supplier_source text, supplier_id text, user_id uuid, rating smallint, comment text, comment_status text, moderation_reason text, is_mine boolean, created_at timestamp with time zone, updated_at timestamp with time zone, author_name text, author_avatar_url text, author_agency_name text)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  RETURN QUERY
  SELECT r.id,
         r.supplier_source,
         r.supplier_id,
         CASE WHEN r.user_id = v_uid THEN r.user_id ELSE NULL END,
         r.rating,
         CASE WHEN r.comment_status = 'approved' OR r.user_id = v_uid THEN r.comment ELSE NULL END,
         CASE
           WHEN r.user_id = v_uid THEN r.comment_status
           WHEN r.comment_status = 'approved' THEN 'approved'
           ELSE 'none'
         END,
         CASE WHEN r.user_id = v_uid THEN r.moderation_reason ELSE NULL END,
         (r.user_id = v_uid),
         r.created_at,
         r.updated_at,
         p.name,
         p.avatar_url,
         p.agency_name
  FROM public.supplier_community_reviews r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  WHERE r.supplier_source = _source
    AND r.supplier_id = _supplier_id
  ORDER BY (r.user_id = v_uid) DESC, r.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 50), 200))
  OFFSET greatest(0, coalesce(_offset, 0));
END;
$function$;

-- 6) Audit trail on self-delete
CREATE OR REPLACE FUNCTION public.delete_my_supplier_review(_review_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_review public.supplier_community_reviews;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  SELECT * INTO v_review
  FROM public.supplier_community_reviews
  WHERE id = _review_id AND user_id = v_uid
  FOR UPDATE;

  IF v_review.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  INSERT INTO public.supplier_review_moderation_events
    (review_id, supplier_source, supplier_id, reviewer_user_id, action, rating,
     comment_snapshot, reason, moderated_by)
  VALUES (v_review.id, v_review.supplier_source, v_review.supplier_id, v_review.user_id,
          'deleted', v_review.rating, v_review.comment, 'self_delete', v_uid);

  DELETE FROM public.supplier_community_reviews WHERE id = v_review.id;

  RETURN true;
END;
$function$;

-- 7) Permissions hardening (idempotent)
REVOKE ALL ON FUNCTION public.supplier_review_target_exists(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.supplier_review_is_own_company(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.supplier_review_eligibility() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.submit_supplier_review(text, text, smallint, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.delete_my_supplier_review(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.report_supplier_review(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.moderate_supplier_review(uuid, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_supplier_reviews(text, text, integer, integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.get_supplier_review_stats() FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.supplier_review_target_exists(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_review_is_own_company(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.supplier_review_eligibility() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.submit_supplier_review(text, text, smallint, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.delete_my_supplier_review(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.report_supplier_review(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.moderate_supplier_review(uuid, text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_supplier_reviews(text, text, integer, integer) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_supplier_review_stats() TO authenticated, service_role;

-- No direct writes on the review tables for clients
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.supplier_community_reviews FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.supplier_review_moderation_events FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES ON public.supplier_review_reports FROM authenticated, anon;
REVOKE ALL ON public.supplier_community_reviews FROM anon;
REVOKE ALL ON public.supplier_review_moderation_events FROM anon;
REVOKE ALL ON public.supplier_review_reports FROM anon;
GRANT SELECT ON public.supplier_community_reviews TO authenticated;
GRANT SELECT ON public.supplier_review_moderation_events TO authenticated;
GRANT SELECT ON public.supplier_review_reports TO authenticated;
GRANT ALL ON public.supplier_community_reviews TO service_role;
GRANT ALL ON public.supplier_review_moderation_events TO service_role;
GRANT ALL ON public.supplier_review_reports TO service_role;