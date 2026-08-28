ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_secondary_color text,
  ADD COLUMN IF NOT EXISTS agency_secondary_auto boolean NOT NULL DEFAULT true;

CREATE OR REPLACE FUNCTION public.get_agency_domain(p_hostname text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'user_id', d.user_id,
    'agency_slug', d.agency_slug,
    'hostname', d.hostname,
    'is_primary', d.is_primary,
    'agency_name', COALESCE(p.agency_name, p.name),
    'owner_name', p.name,
    'logo_url', p.agency_logo_url,
    'cover_image_url', p.cover_image_url,
    'primary_color', p.agency_primary_color,
    'secondary_color', p.agency_secondary_color,
    'secondary_auto', COALESCE(p.agency_secondary_auto, true),
    'phone', p.phone,
    'city', p.city,
    'state', p.state,
    'bio', p.bio,
    'public_slug', p.public_slug,
    'cnpj', p.cnpj
  )
  FROM public.agency_public_domains d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  WHERE d.is_active
    AND d.hostname = lower(btrim(p_hostname))
  LIMIT 1
$function$;

DROP FUNCTION IF EXISTS public.get_public_profile(uuid);

CREATE FUNCTION public.get_public_profile(_user_id uuid)
 RETURNS TABLE(user_id uuid, name text, avatar_url text, agency_name text, agency_logo_url text, city text, state text, phone text, agency_primary_color text, agency_secondary_color text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.name, p.avatar_url, p.agency_name,
    p.agency_logo_url, p.city, p.state, p.phone,
    p.agency_primary_color, p.agency_secondary_color
  FROM public.profiles p WHERE p.user_id = _user_id;
$function$;

GRANT EXECUTE ON FUNCTION public.get_public_profile(uuid) TO anon, authenticated, service_role;