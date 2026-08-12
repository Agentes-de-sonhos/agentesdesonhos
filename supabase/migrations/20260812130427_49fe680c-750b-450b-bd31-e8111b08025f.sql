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