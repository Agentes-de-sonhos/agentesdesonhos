-- Grant only the group invitation, never personal/CRM records. The browser
-- proves possession of both the site request receipt and its session token.
BEGIN;
CREATE OR REPLACE FUNCTION public.confirm_bagagem_opportunity_group(
  p_request_id uuid,
  p_session_id text
)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $function$
  SELECT 'https://chat.whatsapp.com/Eqc08LTxqMcJIAir5xuS4l?s=cl&p=i&mlu=4&ilr=4&iam=2'::text
  FROM public.agency_site_requests AS r
  JOIN public.agency_public_domains AS d
    ON d.user_id = r.agency_user_id AND d.hostname = r.hostname AND d.is_active
  WHERE r.id = p_request_id
    AND p_session_id ~ '^[0-9a-f]{32}$'
    AND r.session_id = p_session_id
    AND r.hostname IN ('bagagemnamao.com.br','www.bagagemnamao.com.br')
    AND r.service_key = 'inspiracoes'
    AND r.created_at > now() - interval '15 minutes'
    AND r.consent_at IS NOT NULL
    AND r.client_id IS NOT NULL
    AND r.opportunity_id IS NOT NULL
  LIMIT 1
$function$;

REVOKE ALL ON FUNCTION public.confirm_bagagem_opportunity_group(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_bagagem_opportunity_group(uuid, text) TO anon, authenticated;
COMMIT;
