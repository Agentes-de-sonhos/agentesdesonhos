CREATE OR REPLACE FUNCTION public.get_public_quote_documents_by_share_token(p_share_token text)
RETURNS TABLE(id uuid, file_name text, file_path text, file_type text, file_size bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.id, d.file_name, d.file_path, d.file_type, d.file_size::bigint
  FROM public.quote_documents d
  JOIN public.quotes q ON q.id = d.quote_id
  WHERE p_share_token IS NOT NULL
    AND length(p_share_token) >= 12
    AND q.share_token = p_share_token
    AND q.status = 'published'
    AND (q.share_expires_at IS NULL OR q.share_expires_at > now())
    AND d.is_public = true
  ORDER BY d.created_at ASC
$function$;

CREATE OR REPLACE FUNCTION public.get_public_quote_documents_by_public_code(p_agency_slug text, p_code text)
RETURNS TABLE(id uuid, file_name text, file_path text, file_type text, file_size bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.id, d.file_name, d.file_path, d.file_type, d.file_size::bigint
  FROM public.quote_documents d
  JOIN public.quotes q ON q.id = d.quote_id
  WHERE p_code IS NOT NULL
    AND length(p_code) >= 12
    AND q.public_access_code = p_code
    AND q.status = 'published'
    AND public.agency_public_slug_matches(q.user_id, p_agency_slug)
    AND d.is_public = true
  ORDER BY d.created_at ASC
$function$;

REVOKE ALL ON FUNCTION public.get_public_quote_documents_by_share_token(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_quote_documents_by_public_code(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_quote_documents_by_share_token(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_public_quote_documents_by_public_code(text, text) TO anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.get_public_quote_documents(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_public_quote_documents(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_public_quote_documents(uuid) FROM authenticated;
DROP FUNCTION IF EXISTS public.get_public_quote_documents(uuid);