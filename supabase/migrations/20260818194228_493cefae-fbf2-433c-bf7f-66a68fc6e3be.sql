REVOKE ALL ON FUNCTION public.agency_public_slug_matches(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.agency_public_slug_matches(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.agency_public_slug_matches(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.agency_public_slug_matches(uuid, text) TO service_role;