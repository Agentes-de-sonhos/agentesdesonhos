CREATE OR REPLACE FUNCTION public.supplier_slug_exists(p_slug text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.tour_operators
    WHERE lower(public_slug) = lower(p_slug)
  );
$$;

GRANT EXECUTE ON FUNCTION public.supplier_slug_exists(text) TO anon, authenticated;