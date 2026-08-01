-- ============================================================
-- Camada canônica de avaliações (Reconhecimento da comunidade)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.supplier_community_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_source text NOT NULL,
  supplier_id text NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rating smallint NOT NULL,
  comment text,
  comment_status text NOT NULL DEFAULT 'none',
  moderation_reason text,
  moderated_by uuid,
  moderated_at timestamptz,
  legacy_table text,
  legacy_review_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_community_reviews_source_check
    CHECK (supplier_source IN ('operator','supplier','guide','cruise','travelmeet')),
  CONSTRAINT supplier_community_reviews_rating_check
    CHECK (rating BETWEEN 3 AND 5),
  CONSTRAINT supplier_community_reviews_comment_len_check
    CHECK (comment IS NULL OR char_length(comment) <= 500),
  CONSTRAINT supplier_community_reviews_rating3_no_comment_check
    CHECK (rating > 3 OR comment IS NULL),
  CONSTRAINT supplier_community_reviews_status_check
    CHECK (
      (comment IS NULL AND comment_status = 'none')
      OR (comment IS NOT NULL AND comment_status IN ('pending','approved','rejected'))
    ),
  CONSTRAINT supplier_community_reviews_unique_vote
    UNIQUE (supplier_source, supplier_id, user_id)
);

CREATE INDEX IF NOT EXISTS supplier_community_reviews_target_idx
  ON public.supplier_community_reviews (supplier_source, supplier_id);
CREATE INDEX IF NOT EXISTS supplier_community_reviews_user_idx
  ON public.supplier_community_reviews (user_id);
CREATE INDEX IF NOT EXISTS supplier_community_reviews_status_idx
  ON public.supplier_community_reviews (comment_status);
CREATE UNIQUE INDEX IF NOT EXISTS supplier_community_reviews_legacy_idx
  ON public.supplier_community_reviews (legacy_table, legacy_review_id)
  WHERE legacy_review_id IS NOT NULL;

GRANT SELECT ON public.supplier_community_reviews TO authenticated;
GRANT ALL ON public.supplier_community_reviews TO service_role;
ALTER TABLE public.supplier_community_reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own community reviews" ON public.supplier_community_reviews;
CREATE POLICY "Users read own community reviews"
  ON public.supplier_community_reviews FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins read all community reviews" ON public.supplier_community_reviews;
CREATE POLICY "Admins read all community reviews"
  ON public.supplier_community_reviews FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Log auditável de moderação
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_review_moderation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL,
  supplier_source text NOT NULL,
  supplier_id text NOT NULL,
  reviewer_user_id uuid NOT NULL,
  action text NOT NULL,
  rating smallint,
  comment_snapshot text,
  reason text,
  moderated_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_review_moderation_events_action_check
    CHECK (action IN ('approved','rejected','deleted','reported','resolved','dismissed'))
);
CREATE INDEX IF NOT EXISTS supplier_review_moderation_events_review_idx
  ON public.supplier_review_moderation_events (review_id, created_at DESC);

GRANT SELECT ON public.supplier_review_moderation_events TO authenticated;
GRANT ALL ON public.supplier_review_moderation_events TO service_role;
ALTER TABLE public.supplier_review_moderation_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins read moderation events" ON public.supplier_review_moderation_events;
CREATE POLICY "Admins read moderation events"
  ON public.supplier_review_moderation_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- Denúncias de comentários
-- ============================================================
CREATE TABLE IF NOT EXISTS public.supplier_review_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id uuid NOT NULL REFERENCES public.supplier_community_reviews(id) ON DELETE CASCADE,
  reporter_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT supplier_review_reports_status_check CHECK (status IN ('open','resolved','dismissed')),
  CONSTRAINT supplier_review_reports_details_len CHECK (details IS NULL OR char_length(details) <= 500),
  CONSTRAINT supplier_review_reports_unique UNIQUE (review_id, reporter_user_id)
);
CREATE INDEX IF NOT EXISTS supplier_review_reports_status_idx
  ON public.supplier_review_reports (status, created_at DESC);

GRANT SELECT ON public.supplier_review_reports TO authenticated;
GRANT ALL ON public.supplier_review_reports TO service_role;
ALTER TABLE public.supplier_review_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Reporters read own reports" ON public.supplier_review_reports;
CREATE POLICY "Reporters read own reports"
  ON public.supplier_review_reports FOR SELECT TO authenticated
  USING (auth.uid() = reporter_user_id);

DROP POLICY IF EXISTS "Admins read reports" ON public.supplier_review_reports;
CREATE POLICY "Admins read reports"
  ON public.supplier_review_reports FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- ============================================================
-- updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION public.touch_supplier_community_reviews()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_touch_supplier_community_reviews ON public.supplier_community_reviews;
CREATE TRIGGER trg_touch_supplier_community_reviews
  BEFORE UPDATE ON public.supplier_community_reviews
  FOR EACH ROW EXECUTE FUNCTION public.touch_supplier_community_reviews();

-- ============================================================
-- Migração idempotente das avaliações legadas
-- ============================================================
INSERT INTO public.supplier_community_reviews
  (supplier_source, supplier_id, user_id, rating, comment, comment_status,
   legacy_table, legacy_review_id, created_at, updated_at)
SELECT 'operator', r.operator_id::text, r.user_id,
       GREATEST(3, LEAST(5, r.rating)),
       NULLIF(btrim(coalesce(r.comment, '')), ''),
       CASE WHEN NULLIF(btrim(coalesce(r.comment, '')), '') IS NULL THEN 'none' ELSE 'approved' END,
       'operator_reviews', r.id, r.created_at, r.updated_at
FROM public.operator_reviews r
WHERE r.rating >= 3
ON CONFLICT (supplier_source, supplier_id, user_id) DO NOTHING;

INSERT INTO public.supplier_community_reviews
  (supplier_source, supplier_id, user_id, rating, comment, comment_status,
   legacy_table, legacy_review_id, created_at, updated_at)
SELECT 'supplier', r.supplier_id::text, r.user_id,
       GREATEST(3, LEAST(5, r.rating)),
       NULLIF(btrim(coalesce(r.comment, '')), ''),
       CASE WHEN NULLIF(btrim(coalesce(r.comment, '')), '') IS NULL THEN 'none' ELSE 'approved' END,
       'supplier_reviews', r.id, r.created_at, r.updated_at
FROM public.supplier_reviews r
WHERE r.rating >= 3
ON CONFLICT (supplier_source, supplier_id, user_id) DO NOTHING;

INSERT INTO public.supplier_community_reviews
  (supplier_source, supplier_id, user_id, rating, comment, comment_status,
   legacy_table, legacy_review_id, created_at, updated_at)
SELECT 'cruise', r.cruise_id::text, r.user_id,
       GREATEST(3, LEAST(5, r.rating)),
       NULLIF(btrim(coalesce(r.comment, '')), ''),
       CASE WHEN NULLIF(btrim(coalesce(r.comment, '')), '') IS NULL THEN 'none' ELSE 'approved' END,
       'cruise_reviews', r.id, r.created_at, r.updated_at
FROM public.cruise_reviews r
WHERE r.rating >= 3
ON CONFLICT (supplier_source, supplier_id, user_id) DO NOTHING;

-- ============================================================
-- Projeções seguras (views owned by postgres → não expõem a tabela crua)
-- ============================================================
CREATE OR REPLACE VIEW public.supplier_review_stats AS
SELECT supplier_source,
       supplier_id,
       count(*)::int AS review_count,
       round(avg(rating)::numeric, 1) AS average_rating
FROM public.supplier_community_reviews
GROUP BY supplier_source, supplier_id;

CREATE OR REPLACE VIEW public.supplier_review_feed AS
SELECT r.id,
       r.supplier_source,
       r.supplier_id,
       r.user_id,
       r.rating,
       CASE
         WHEN r.comment_status = 'approved' THEN r.comment
         WHEN r.user_id = auth.uid() THEN r.comment
         ELSE NULL
       END AS comment,
       CASE
         WHEN r.user_id = auth.uid() THEN r.comment_status
         WHEN r.comment_status = 'approved' THEN 'approved'
         ELSE 'none'
       END AS comment_status,
       CASE WHEN r.user_id = auth.uid() THEN r.moderation_reason ELSE NULL END AS moderation_reason,
       (r.user_id = auth.uid()) AS is_mine,
       r.created_at,
       r.updated_at,
       p.name AS author_name,
       p.avatar_url AS author_avatar_url,
       p.agency_name AS author_agency_name
FROM public.supplier_community_reviews r
LEFT JOIN public.profiles p ON p.user_id = r.user_id;

GRANT SELECT ON public.supplier_review_stats TO authenticated;
GRANT SELECT ON public.supplier_review_feed TO authenticated;

-- ============================================================
-- Elegibilidade
-- ============================================================
CREATE OR REPLACE FUNCTION public.supplier_review_eligibility()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
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

  RETURN jsonb_build_object('eligible', true, 'reason', 'ok');
END;
$$;

REVOKE ALL ON FUNCTION public.supplier_review_eligibility() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supplier_review_eligibility() TO authenticated;

CREATE OR REPLACE FUNCTION public.supplier_review_is_own_company(_source text, _supplier_id text)
RETURNS boolean LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_own boolean := false;
BEGIN
  IF v_uid IS NULL THEN RETURN false; END IF;

  IF _source = 'operator' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tour_operators o
      WHERE o.id::text = _supplier_id
        AND (o.user_id = v_uid OR o.owner_agency_id = v_uid)
    ) INTO v_own;
  ELSIF _source = 'guide' THEN
    SELECT EXISTS (
      SELECT 1 FROM public.tour_guides g
      WHERE g.id::text = _supplier_id AND g.user_id = v_uid
    ) INTO v_own;
  END IF;

  RETURN coalesce(v_own, false);
END;
$$;

REVOKE ALL ON FUNCTION public.supplier_review_is_own_company(text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.supplier_review_is_own_company(text, text) TO authenticated;

-- ============================================================
-- RPC: criar/editar avaliação
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_supplier_review(
  _source text,
  _supplier_id text,
  _rating smallint,
  _comment text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

  IF _source NOT IN ('operator','supplier','guide','cruise','travelmeet') THEN
    RAISE EXCEPTION 'invalid_source';
  END IF;
  IF _supplier_id IS NULL OR btrim(_supplier_id) = '' THEN
    RAISE EXCEPTION 'invalid_supplier';
  END IF;
  IF _rating IS NULL OR _rating < 3 OR _rating > 5 THEN
    RAISE EXCEPTION 'invalid_rating';
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
$$;

REVOKE ALL ON FUNCTION public.submit_supplier_review(text, text, smallint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_supplier_review(text, text, smallint, text) TO authenticated;

-- ============================================================
-- RPC: excluir própria avaliação
-- ============================================================
CREATE OR REPLACE FUNCTION public.delete_my_supplier_review(_review_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_deleted int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  DELETE FROM public.supplier_community_reviews
  WHERE id = _review_id AND user_id = v_uid;
  GET DIAGNOSTICS v_deleted = ROW_COUNT;

  IF v_deleted = 0 THEN RAISE EXCEPTION 'not_found'; END IF;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_my_supplier_review(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_my_supplier_review(uuid) TO authenticated;

-- ============================================================
-- RPC: moderação (admin)
-- ============================================================
CREATE OR REPLACE FUNCTION public.moderate_supplier_review(
  _review_id uuid,
  _action text,
  _reason text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_review public.supplier_community_reviews;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF NOT public.has_role(v_uid, 'admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _action NOT IN ('approve','reject','delete') THEN RAISE EXCEPTION 'invalid_action'; END IF;

  SELECT * INTO v_review FROM public.supplier_community_reviews WHERE id = _review_id FOR UPDATE;
  IF v_review.id IS NULL THEN RAISE EXCEPTION 'not_found'; END IF;

  INSERT INTO public.supplier_review_moderation_events
    (review_id, supplier_source, supplier_id, reviewer_user_id, action, rating,
     comment_snapshot, reason, moderated_by)
  VALUES (v_review.id, v_review.supplier_source, v_review.supplier_id, v_review.user_id,
          CASE _action WHEN 'approve' THEN 'approved' WHEN 'reject' THEN 'rejected' ELSE 'deleted' END,
          v_review.rating, v_review.comment, NULLIF(btrim(coalesce(_reason, '')), ''), v_uid);

  IF _action = 'delete' THEN
    DELETE FROM public.supplier_community_reviews WHERE id = v_review.id;
    RETURN jsonb_build_object('id', _review_id, 'deleted', true);
  END IF;

  IF v_review.comment IS NULL THEN RAISE EXCEPTION 'no_comment'; END IF;

  UPDATE public.supplier_community_reviews
    SET comment_status = CASE _action WHEN 'approve' THEN 'approved' ELSE 'rejected' END,
        moderation_reason = NULLIF(btrim(coalesce(_reason, '')), ''),
        moderated_by = v_uid,
        moderated_at = now()
  WHERE id = v_review.id;

  UPDATE public.supplier_review_reports
    SET status = CASE _action WHEN 'reject' THEN 'resolved' ELSE 'dismissed' END,
        resolved_by = v_uid,
        resolved_at = now()
  WHERE review_id = v_review.id AND status = 'open';

  RETURN jsonb_build_object('id', v_review.id, 'comment_status',
    CASE _action WHEN 'approve' THEN 'approved' ELSE 'rejected' END);
END;
$$;

REVOKE ALL ON FUNCTION public.moderate_supplier_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.moderate_supplier_review(uuid, text, text) TO authenticated;

-- ============================================================
-- RPC: denunciar comentário
-- ============================================================
CREATE OR REPLACE FUNCTION public.report_supplier_review(
  _review_id uuid,
  _reason text,
  _details text DEFAULT NULL
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_review public.supplier_community_reviews;
  v_recent int;
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;
  IF _reason IS NULL OR btrim(_reason) = '' THEN RAISE EXCEPTION 'invalid_reason'; END IF;

  SELECT * INTO v_review FROM public.supplier_community_reviews WHERE id = _review_id;
  IF v_review.id IS NULL OR v_review.comment_status <> 'approved' THEN RAISE EXCEPTION 'not_found'; END IF;
  IF v_review.user_id = v_uid THEN RAISE EXCEPTION 'own_review'; END IF;

  SELECT count(*)::int INTO v_recent
  FROM public.supplier_review_reports
  WHERE reporter_user_id = v_uid AND created_at > now() - interval '1 hour';
  IF v_recent >= 10 THEN RAISE EXCEPTION 'rate_limited'; END IF;

  INSERT INTO public.supplier_review_reports (review_id, reporter_user_id, reason, details)
  VALUES (v_review.id, v_uid, left(btrim(_reason), 100), NULLIF(left(btrim(coalesce(_details, '')), 500), ''))
  ON CONFLICT (review_id, reporter_user_id) DO NOTHING;

  INSERT INTO public.supplier_review_moderation_events
    (review_id, supplier_source, supplier_id, reviewer_user_id, action, rating,
     comment_snapshot, reason, moderated_by)
  VALUES (v_review.id, v_review.supplier_source, v_review.supplier_id, v_review.user_id,
          'reported', v_review.rating, v_review.comment, left(btrim(_reason), 100), v_uid);

  RETURN jsonb_build_object('id', v_review.id, 'reported', true);
END;
$$;

REVOKE ALL ON FUNCTION public.report_supplier_review(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_supplier_review(uuid, text, text) TO authenticated;

-- ============================================================
-- RPC: listagem administrativa (autor + fornecedor + denúncias)
-- ============================================================
CREATE OR REPLACE FUNCTION public.admin_list_supplier_reviews(
  _status text DEFAULT NULL,
  _source text DEFAULT NULL,
  _rating smallint DEFAULT NULL,
  _limit int DEFAULT 100,
  _offset int DEFAULT 0
)
RETURNS TABLE (
  id uuid,
  supplier_source text,
  supplier_id text,
  user_id uuid,
  rating smallint,
  comment text,
  comment_status text,
  moderation_reason text,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_agency_name text,
  author_avatar_url text,
  open_reports int,
  report_reasons text[]
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  SELECT r.id, r.supplier_source, r.supplier_id, r.user_id, r.rating, r.comment,
         r.comment_status, r.moderation_reason, r.created_at, r.updated_at,
         p.name, p.agency_name, p.avatar_url,
         coalesce(rep.open_count, 0)::int,
         coalesce(rep.reasons, ARRAY[]::text[])
  FROM public.supplier_community_reviews r
  LEFT JOIN public.profiles p ON p.user_id = r.user_id
  LEFT JOIN (
    SELECT review_id, count(*)::int AS open_count, array_agg(reason) AS reasons
    FROM public.supplier_review_reports WHERE status = 'open' GROUP BY review_id
  ) rep ON rep.review_id = r.id
  WHERE (_status IS NULL
         OR (_status = 'reported' AND coalesce(rep.open_count, 0) > 0)
         OR (_status <> 'reported' AND r.comment_status = _status))
    AND (_source IS NULL OR r.supplier_source = _source)
    AND (_rating IS NULL OR r.rating = _rating)
  ORDER BY r.created_at DESC
  LIMIT greatest(1, least(coalesce(_limit, 100), 200))
  OFFSET greatest(0, coalesce(_offset, 0));
END;
$$;

REVOKE ALL ON FUNCTION public.admin_list_supplier_reviews(text, text, smallint, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_supplier_reviews(text, text, smallint, int, int) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_supplier_review_counts()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_result jsonb;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT jsonb_build_object(
    'pending', (SELECT count(*) FROM public.supplier_community_reviews WHERE comment_status = 'pending'),
    'approved', (SELECT count(*) FROM public.supplier_community_reviews WHERE comment_status = 'approved'),
    'rejected', (SELECT count(*) FROM public.supplier_community_reviews WHERE comment_status = 'rejected'),
    'reported', (SELECT count(DISTINCT review_id) FROM public.supplier_review_reports WHERE status = 'open'),
    'total', (SELECT count(*) FROM public.supplier_community_reviews)
  ) INTO v_result;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_supplier_review_counts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_supplier_review_counts() TO authenticated;