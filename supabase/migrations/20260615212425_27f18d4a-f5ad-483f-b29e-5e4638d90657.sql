-- Fase 1: view de compatibilidade (sem alterar RLS de profiles)
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = false) AS
SELECT
  user_id,
  name,
  avatar_url,
  agency_name,
  agency_logo_url,
  city,
  state,
  phone,
  bio,
  specialties,
  services,
  niche,
  niches,
  years_in_business,
  help_offer,
  partnership_interests,
  cover_image_url
FROM public.profiles;

ALTER VIEW public.profiles_public OWNER TO postgres;

REVOKE ALL ON public.profiles_public FROM PUBLIC;
REVOKE ALL ON public.profiles_public FROM anon;
GRANT SELECT ON public.profiles_public TO authenticated;
GRANT SELECT ON public.profiles_public TO service_role;

COMMENT ON VIEW public.profiles_public IS
  'Public-safe projection of profiles. Use this for any read of OTHER users (community, Q&A, reviews, chat, marketplace, academy, directories). Never exposes cpf/cnpj/address/zip.';