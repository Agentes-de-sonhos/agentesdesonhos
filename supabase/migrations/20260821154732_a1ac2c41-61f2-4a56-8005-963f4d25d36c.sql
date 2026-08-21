-- Schema interno (não exposto pela API) para funções de leitura controlada
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO anon, authenticated, service_role;

-- 1) profiles_public deixa de ser SECURITY DEFINER view
CREATE OR REPLACE FUNCTION private.public_profiles_rows()
RETURNS SETOF public.profiles
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.profiles
$$;

REVOKE ALL ON FUNCTION private.public_profiles_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.public_profiles_rows() TO anon, authenticated, service_role;

DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = true) AS
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
FROM private.public_profiles_rows();

REVOKE ALL ON public.profiles_public FROM PUBLIC;
GRANT SELECT ON public.profiles_public TO anon, authenticated, service_role;

-- 2) community_members: remover exposição de CNPJ a qualquer autenticado
DROP POLICY IF EXISTS "Members basic info readable by authenticated" ON public.community_members;

CREATE OR REPLACE FUNCTION private.public_community_members_rows()
RETURNS SETOF public.community_members
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.community_members
  WHERE status = ANY (ARRAY['approved_unverified'::text, 'verified'::text])
$$;

REVOKE ALL ON FUNCTION private.public_community_members_rows() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.public_community_members_rows() TO authenticated, service_role;

DROP VIEW IF EXISTS public.community_members_public;
CREATE VIEW public.community_members_public
WITH (security_invoker = true) AS
SELECT
  id,
  user_id,
  status,
  entry_method,
  years_experience,
  bio,
  segments,
  specialties,
  created_at,
  updated_at
FROM private.public_community_members_rows();

REVOKE ALL ON public.community_members_public FROM PUBLIC;
GRANT SELECT ON public.community_members_public TO authenticated, service_role;