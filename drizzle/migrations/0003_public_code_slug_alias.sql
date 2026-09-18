-- Compatibilidade mínima e genérica: o slug público do tenant (profiles.public_slug)
-- vale como alias do slug derivado do nome da agência nas resoluções públicas.
CREATE OR REPLACE FUNCTION public.public_slug_alias_matches(p_user_id uuid, p_agency_slug text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.user_id = p_user_id
      AND (
        trim(both '-' from regexp_replace(regexp_replace(lower(public.unaccent(COALESCE(p.agency_name, ''))), '[^a-z0-9\-]', '-', 'g'), '-+', '-', 'g')) = lower(COALESCE(p_agency_slug, ''))
        OR lower(COALESCE(p.public_slug, '')) = lower(COALESCE(p_agency_slug, ''))
      )
  )
$$;

REVOKE ALL ON FUNCTION public.public_slug_alias_matches(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_slug_alias_matches(uuid, text) TO anon, authenticated, service_role;
