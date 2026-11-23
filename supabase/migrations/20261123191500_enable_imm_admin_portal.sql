UPDATE public.agency_public_domains
   SET admin_portal_enabled = true, updated_at = now()
 WHERE hostname IN ('immturismo.com.br','www.immturismo.com.br')
   AND user_id = '2119703a-e00e-4b85-a6b0-e912479eb99a';
