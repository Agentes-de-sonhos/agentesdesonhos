CREATE OR REPLACE FUNCTION public.list_community_agents(
  p_search text DEFAULT NULL,
  p_specialty text DEFAULT NULL,
  p_limit int DEFAULT 24,
  p_offset int DEFAULT 0
)
RETURNS TABLE (
  user_id uuid,
  name text,
  avatar_url text,
  agency_name text,
  city text,
  state text,
  specialties text[],
  status text,
  is_verified boolean,
  total_count bigint
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      p.user_id,
      COALESCE(NULLIF(TRIM(p.name), ''), 'Agente') AS name,
      p.avatar_url,
      p.agency_name,
      p.city,
      p.state,
      COALESCE(
        NULLIF(cm.specialties, '{}'::text[]),
        NULLIF(p.specialties, '{}'::text[]),
        '{}'::text[]
      ) AS specialties,
      COALESCE(cm.status, 'approved_unverified') AS status
    FROM public.profiles p
    JOIN public.user_roles ur
      ON ur.user_id = p.user_id AND ur.role = 'agente'
    LEFT JOIN public.community_members cm
      ON cm.user_id = p.user_id
    WHERE COALESCE(cm.status, '') <> 'blocked'
      AND p.user_id IS NOT NULL
  ),
  filtered AS (
    SELECT *
    FROM base b
    WHERE
      (
        p_search IS NULL OR p_search = ''
        OR public.immutable_unaccent(lower(b.name))         LIKE '%' || public.immutable_unaccent(lower(p_search)) || '%'
        OR public.immutable_unaccent(lower(COALESCE(b.agency_name,''))) LIKE '%' || public.immutable_unaccent(lower(p_search)) || '%'
        OR public.immutable_unaccent(lower(COALESCE(b.city,'')))        LIKE '%' || public.immutable_unaccent(lower(p_search)) || '%'
        OR public.immutable_unaccent(lower(COALESCE(b.state,'')))       LIKE '%' || public.immutable_unaccent(lower(p_search)) || '%'
        OR EXISTS (
          SELECT 1 FROM unnest(b.specialties) s
          WHERE public.immutable_unaccent(lower(s)) LIKE '%' || public.immutable_unaccent(lower(p_search)) || '%'
        )
      )
      AND (
        p_specialty IS NULL OR p_specialty = ''
        OR p_specialty = ANY (b.specialties)
      )
  ),
  counted AS (
    SELECT (SELECT count(*) FROM filtered) AS total_count
  )
  SELECT
    f.user_id,
    f.name,
    f.avatar_url,
    f.agency_name,
    f.city,
    f.state,
    f.specialties,
    f.status,
    (f.status = 'verified') AS is_verified,
    c.total_count
  FROM filtered f
  CROSS JOIN counted c
  ORDER BY
    (f.avatar_url IS NOT NULL AND f.avatar_url <> '') DESC,
    (f.agency_name IS NOT NULL AND f.agency_name <> '') DESC,
    (array_length(f.specialties, 1) IS NOT NULL) DESC,
    f.name ASC
  LIMIT GREATEST(p_limit, 1)
  OFFSET GREATEST(p_offset, 0);
END;
$$;

REVOKE ALL ON FUNCTION public.list_community_agents(text, text, int, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_community_agents(text, text, int, int) TO authenticated;