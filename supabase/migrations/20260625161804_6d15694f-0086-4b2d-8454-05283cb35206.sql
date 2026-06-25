CREATE OR REPLACE FUNCTION public.get_published_supplier_by_slug(p_slug text)
RETURNS json
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  op RECORD;
BEGIN
  IF p_slug IS NULL OR length(trim(p_slug)) < 1 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO op
  FROM public.tour_operators
  WHERE lower(public_slug) = lower(trim(p_slug))
    AND is_active = true
    AND COALESCE(is_public_visible, true) = true
  LIMIT 1;

  IF op.id IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN json_build_object(
    'id', op.id,
    'name', op.name,
    'category', op.category,
    'logo_url', op.logo_url,
    'short_description', op.short_description,
    'competitive_advantages', op.competitive_advantages,
    'how_to_sell', op.how_to_sell,
    'sales_channels', op.sales_channels,
    'commercial_contacts', op.commercial_contacts,
    'specialties', op.specialties,
    'website', op.website,
    'instagram', op.instagram,
    'social_links', op.social_links,
    'business_hours', op.business_hours,
    'certifications', op.certifications,
    'founded_year', op.founded_year,
    'employees', op.employees,
    'executive_team', op.executive_team,
    'public_slug', op.public_slug,
    'is_public_visible', op.is_public_visible
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_published_supplier_by_slug(text) TO anon, authenticated;