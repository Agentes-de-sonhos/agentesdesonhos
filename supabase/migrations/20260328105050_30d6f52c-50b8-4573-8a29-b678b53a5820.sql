
DROP FUNCTION public.get_public_profile(uuid);
DROP FUNCTION public.get_public_profiles(uuid[]);

CREATE FUNCTION public.get_public_profile(_user_id uuid)
RETURNS TABLE(
  user_id uuid, name text, avatar_url text, agency_name text,
  agency_logo_url text, city text, state text, phone text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.avatar_url, p.agency_name,
    p.agency_logo_url, p.city, p.state, p.phone
  FROM public.profiles p WHERE p.user_id = _user_id;
$$;

CREATE FUNCTION public.get_public_profiles(_user_ids uuid[])
RETURNS TABLE(
  user_id uuid, name text, avatar_url text, agency_name text,
  agency_logo_url text, city text, state text, phone text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT p.user_id, p.name, p.avatar_url, p.agency_name,
    p.agency_logo_url, p.city, p.state, p.phone
  FROM public.profiles p WHERE p.user_id = ANY(_user_ids);
$$;
