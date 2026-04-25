-- 1. Add columns
ALTER TABLE public.tour_operators
  ADD COLUMN IF NOT EXISTS public_slug text,
  ADD COLUMN IF NOT EXISTS is_published boolean NOT NULL DEFAULT false;

-- 2. Unique index on slug (case-insensitive, ignoring nulls)
CREATE UNIQUE INDEX IF NOT EXISTS tour_operators_public_slug_unique
  ON public.tour_operators (lower(public_slug))
  WHERE public_slug IS NOT NULL;

-- 3. Slug generation helper (idempotent + collision-safe)
CREATE OR REPLACE FUNCTION public.generate_supplier_slug(p_name text, p_existing_id uuid DEFAULT NULL)
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  IF p_name IS NULL OR length(trim(p_name)) = 0 THEN
    RETURN NULL;
  END IF;
  base_slug := lower(public.unaccent(p_name));
  base_slug := regexp_replace(base_slug, '[^a-z0-9\-]+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  base_slug := left(base_slug, 60);
  IF base_slug = '' THEN
    base_slug := 'empresa';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (
    SELECT 1 FROM public.tour_operators
    WHERE lower(public_slug) = lower(final_slug)
      AND (p_existing_id IS NULL OR id <> p_existing_id)
  ) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  RETURN final_slug;
END;
$$;

-- 4. Trigger to auto-fill slug on insert if missing
CREATE OR REPLACE FUNCTION public.tour_operators_auto_slug()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.public_slug IS NULL OR length(trim(NEW.public_slug)) = 0 THEN
    NEW.public_slug := public.generate_supplier_slug(NEW.name, NEW.id);
  ELSE
    -- normalize user-provided slug
    NEW.public_slug := lower(public.unaccent(NEW.public_slug));
    NEW.public_slug := regexp_replace(NEW.public_slug, '[^a-z0-9\-]+', '-', 'g');
    NEW.public_slug := regexp_replace(NEW.public_slug, '-+', '-', 'g');
    NEW.public_slug := trim(both '-' from NEW.public_slug);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tour_operators_auto_slug ON public.tour_operators;
CREATE TRIGGER trg_tour_operators_auto_slug
  BEFORE INSERT OR UPDATE OF public_slug, name ON public.tour_operators
  FOR EACH ROW
  EXECUTE FUNCTION public.tour_operators_auto_slug();

-- 5. Backfill existing rows
UPDATE public.tour_operators
SET public_slug = public.generate_supplier_slug(name, id)
WHERE public_slug IS NULL AND name IS NOT NULL;

-- 6. Public RPC: fetch one published supplier by slug
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
  IF p_slug IS NULL OR length(p_slug) < 1 THEN
    RETURN NULL;
  END IF;

  SELECT * INTO op
  FROM public.tour_operators
  WHERE lower(public_slug) = lower(p_slug)
    AND is_published = true
    AND is_active = true
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
    'public_slug', op.public_slug
  );
END;
$$;

-- 7. RLS: allow fornecedor to update own slug (already has UPDATE policy on own row, but add explicit safeguard
--    so admin remains the only one who flips is_published).
CREATE OR REPLACE FUNCTION public.protect_tour_operator_published_field()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  -- non-admin cannot change is_published
  NEW.is_published := OLD.is_published;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_tour_operator_published ON public.tour_operators;
CREATE TRIGGER trg_protect_tour_operator_published
  BEFORE UPDATE ON public.tour_operators
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_tour_operator_published_field();