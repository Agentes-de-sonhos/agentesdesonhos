DROP VIEW IF EXISTS public.supplier_review_feed;
DROP VIEW IF EXISTS public.supplier_review_stats;

CREATE OR REPLACE FUNCTION public.get_supplier_review_stats()
RETURNS TABLE (
  supplier_source text,
  supplier_id text,
  review_count int,
  average_rating numeric
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  RETURN QUERY
  SELECT r.supplier_source,
         r.supplier_id,
         count(*)::int,
         round(avg(r.rating)::numeric, 1)
  FROM public.supplier_community_reviews r
  GROUP BY r.supplier_source, r.supplier_id;
END;
$$;

REVOKE ALL ON FUNCTION public.get_supplier_review_stats() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_review_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.get_supplier_reviews(
  _source text,
  _supplier_id text,
  _limit int DEFAULT 50,
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
  is_mine boolean,
  created_at timestamptz,
  updated_at timestamptz,
  author_name text,
  author_avatar_url text,
  author_agency_name text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RAISE EXCEPTION 'unauthenticated'; END IF;

  RETURN QUERY
  SELECT r.id,
         r.supplier_source,
         r.supplier_id,
         r.user_id,
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
$$;

REVOKE ALL ON FUNCTION public.get_supplier_reviews(text, text, int, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_supplier_reviews(text, text, int, int) TO authenticated;