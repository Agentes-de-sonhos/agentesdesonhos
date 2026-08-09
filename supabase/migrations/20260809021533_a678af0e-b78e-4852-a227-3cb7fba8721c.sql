CREATE TABLE public.agency_public_domains (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hostname text NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  agency_slug text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_agency_public_domains_user ON public.agency_public_domains(user_id);
CREATE INDEX idx_agency_public_domains_active ON public.agency_public_domains(hostname) WHERE is_active;

GRANT SELECT ON public.agency_public_domains TO authenticated;
GRANT ALL ON public.agency_public_domains TO service_role;

ALTER TABLE public.agency_public_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners can view their agency domains"
ON public.agency_public_domains FOR SELECT TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage agency domains"
ON public.agency_public_domains FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_agency_public_domains_updated_at
BEFORE UPDATE ON public.agency_public_domains
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_agency_domain(p_hostname text)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    'public_slug', p.public_slug
  )
  FROM public.agency_public_domains d
  LEFT JOIN public.profiles p ON p.user_id = d.user_id
  WHERE d.is_active
    AND d.hostname = lower(btrim(p_hostname))
  LIMIT 1
$$;

GRANT EXECUTE ON FUNCTION public.get_agency_domain(text) TO anon, authenticated, service_role;