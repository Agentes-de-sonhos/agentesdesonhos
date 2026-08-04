CREATE OR REPLACE FUNCTION public.rsvp_match_subscribers(_emails text[])
RETURNS TABLE (normalized_email text, status text, plan text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  WITH req AS (
    SELECT DISTINCT lower(btrim(e)) AS email
    FROM unnest(coalesce(_emails, ARRAY[]::text[])) AS e
    WHERE btrim(coalesce(e, '')) <> ''
  ),
  matched AS (
    SELECT r.email, u.id AS user_id
    FROM req r
    LEFT JOIN auth.users u ON lower(u.email) = r.email
  ),
  best AS (
    SELECT DISTINCT ON (m.email)
      m.email,
      m.user_id,
      s.id AS sub_id,
      s.plan::text AS plan,
      (s.is_active AND (s.expires_at IS NULL OR s.expires_at > now())) AS valid
    FROM matched m
    LEFT JOIN public.subscriptions s ON s.user_id = m.user_id
    ORDER BY m.email,
      (s.is_active AND (s.expires_at IS NULL OR s.expires_at > now())) DESC NULLS LAST,
      s.updated_at DESC NULLS LAST
  )
  SELECT
    b.email AS normalized_email,
    CASE
      WHEN b.user_id IS NULL THEN 'not_found'
      WHEN b.sub_id IS NULL THEN 'registered_no_subscription'
      WHEN b.valid THEN 'active_subscriber'
      ELSE 'inactive_subscriber'
    END AS status,
    CASE WHEN b.sub_id IS NOT NULL THEN b.plan ELSE NULL END AS plan
  FROM best b;
$$;

REVOKE ALL ON FUNCTION public.rsvp_match_subscribers(text[]) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rsvp_match_subscribers(text[]) FROM anon;
REVOKE ALL ON FUNCTION public.rsvp_match_subscribers(text[]) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.rsvp_match_subscribers(text[]) TO service_role;