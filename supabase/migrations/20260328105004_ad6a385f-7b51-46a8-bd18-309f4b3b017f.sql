
-- Drop the security_invoker view and recreate as security definer function
DROP VIEW IF EXISTS public.profiles_public;

-- Create a SECURITY DEFINER function to safely return public profile data
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  agency_name text,
  agency_logo_url text,
  city text,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.name,
    p.avatar_url,
    p.agency_name,
    p.agency_logo_url,
    p.city,
    p.state
  FROM public.profiles p
  WHERE p.user_id = _user_id;
$$;

-- Also create a batch version for fetching multiple profiles
CREATE OR REPLACE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid,
  name text,
  avatar_url text,
  agency_name text,
  agency_logo_url text,
  city text,
  state text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    p.user_id,
    p.name,
    p.avatar_url,
    p.agency_name,
    p.agency_logo_url,
    p.city,
    p.state
  FROM public.profiles p
  WHERE p.user_id = ANY(_user_ids);
$$;
