ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS agency_tertiary_color text,
  ADD COLUMN IF NOT EXISTS agency_tertiary_auto boolean NOT NULL DEFAULT true;

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
    'tertiary_color', p.agency_tertiary_color,
    'tertiary_auto', COALESCE(p.agency_tertiary_auto, true),
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
CREATE OR REPLACE FUNCTION public.get_public_profile(_user_id uuid)
 RETURNS TABLE(user_id uuid, name text, avatar_url text, agency_name text, agency_logo_url text, city text, state text, phone text, agency_primary_color text, agency_secondary_color text, agency_secondary_auto boolean, agency_tertiary_color text, agency_tertiary_auto boolean)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT p.user_id, p.name, p.avatar_url, p.agency_name,
    p.agency_logo_url, p.city, p.state, p.phone,
    p.agency_primary_color, p.agency_secondary_color,
    COALESCE(p.agency_secondary_auto, true),
    p.agency_tertiary_color,
    COALESCE(p.agency_tertiary_auto, true)
  FROM public.profiles p WHERE p.user_id = _user_id;
$function$;

CREATE TABLE IF NOT EXISTS public.sitelab_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  logo_url text,
  primary_color text NOT NULL DEFAULT '#4B2A6E',
  secondary_color text NOT NULL DEFAULT '#FFD600',
  tertiary_color text NOT NULL DEFAULT '#F3EFF7',
  background_color text NOT NULL DEFAULT '#FFFFFF',
  custom_overrides jsonb NOT NULL DEFAULT '{}'::jsonb,
  password_sha256 text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.sitelab_templates TO service_role;
ALTER TABLE public.sitelab_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Platform admins manage sitelab templates"
  ON public.sitelab_templates FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.sitelab_templates TO authenticated;

DROP TRIGGER IF EXISTS update_sitelab_templates_updated_at ON public.sitelab_templates;
CREATE TRIGGER update_sitelab_templates_updated_at
  BEFORE UPDATE ON public.sitelab_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.get_sitelab_template(p_slug text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'slug', t.slug,
    'name', t.name,
    'logo_url', t.logo_url,
    'primary_color', t.primary_color,
    'secondary_color', t.secondary_color,
    'tertiary_color', t.tertiary_color,
    'background_color', t.background_color,
    'custom_overrides', t.custom_overrides
  )
  FROM public.sitelab_templates t
  WHERE t.is_active AND t.slug = lower(btrim(p_slug))
  LIMIT 1
$function$;

GRANT EXECUTE ON FUNCTION public.get_sitelab_template(text) TO anon, authenticated, service_role;

INSERT INTO public.sitelab_templates (slug, name, primary_color, secondary_color, tertiary_color, background_color, password_sha256)
VALUES ('sitelab-base', 'SiteLab Base', '#4B2A6E', '#FFD600', '#F3EFF7', '#FFFFFF',
        '6a544a424957ac64c29719408179ed532b153075b35d50612faa535c85bc93b3')
ON CONFLICT (slug) DO NOTHING;