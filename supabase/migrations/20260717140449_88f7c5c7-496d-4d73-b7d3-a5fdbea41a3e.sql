
CREATE OR REPLACE FUNCTION public.admin_agency_activity_ranking(_start timestamptz, _end timestamptz)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  WITH
    q AS (SELECT user_id, count(*)::int c FROM public.quotes       WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    t AS (SELECT user_id, count(*)::int c FROM public.trips        WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    it AS (SELECT user_id, count(*)::int c FROM public.itineraries WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    op AS (SELECT user_id, count(*)::int c FROM public.opportunities WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    ops AS (SELECT user_id, count(*)::int c FROM public.operations   WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    s AS (SELECT user_id, count(*)::int c FROM public.sales        WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    cl AS (SELECT user_id, count(*)::int c FROM public.clients     WHERE created_at >= _start AND created_at <= _end GROUP BY user_id),
    ids AS (
      SELECT user_id FROM q UNION
      SELECT user_id FROM t UNION
      SELECT user_id FROM it UNION
      SELECT user_id FROM op UNION
      SELECT user_id FROM ops UNION
      SELECT user_id FROM s UNION
      SELECT user_id FROM cl
    ),
    agg AS (
      SELECT
        ids.user_id AS agency_id,
        p.agency_name,
        p.name AS owner_name,
        u.email AS owner_email,
        coalesce(q.c,0)   AS quotes,
        coalesce(t.c,0)   AS trips,
        coalesce(it.c,0)  AS itineraries,
        coalesce(op.c,0)  AS opportunities,
        coalesce(ops.c,0) AS operations,
        coalesce(s.c,0)   AS sales,
        coalesce(cl.c,0)  AS clients
      FROM ids
      LEFT JOIN public.profiles p ON p.user_id = ids.user_id
      LEFT JOIN auth.users u      ON u.id      = ids.user_id
      LEFT JOIN q   ON q.user_id   = ids.user_id
      LEFT JOIN t   ON t.user_id   = ids.user_id
      LEFT JOIN it  ON it.user_id  = ids.user_id
      LEFT JOIN op  ON op.user_id  = ids.user_id
      LEFT JOIN ops ON ops.user_id = ids.user_id
      LEFT JOIN s   ON s.user_id   = ids.user_id
      LEFT JOIN cl  ON cl.user_id  = ids.user_id
    )
  SELECT jsonb_build_object(
    'agencies', coalesce(jsonb_agg(to_jsonb(agg) ORDER BY (agg.quotes+agg.trips+agg.itineraries) DESC, agg.agency_name ASC), '[]'::jsonb),
    'range_start', _start,
    'range_end', _end
  )
  INTO result FROM agg;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_agency_activity_ranking(timestamptz, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_agency_activity_ranking(timestamptz, timestamptz) TO authenticated;
