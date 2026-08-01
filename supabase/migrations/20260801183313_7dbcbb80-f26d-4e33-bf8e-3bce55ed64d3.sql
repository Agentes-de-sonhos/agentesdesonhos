ALTER TABLE public.tour_operators DROP CONSTRAINT IF EXISTS tour_operators_source_check;
ALTER TABLE public.tour_operators ADD CONSTRAINT tour_operators_source_check CHECK (
  source IS NULL
  OR source = ANY (ARRAY['manual'::text, 'travelmeet'::text, 'agency'::text])
  OR source ~ '^https://brasiltotalreceptivos\.com\.br/associados/[0-9]+$'
);

CREATE OR REPLACE FUNCTION public.protect_tour_operator_published_field()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;
  NEW.is_published := OLD.is_published;
  RETURN NEW;
END;
$$;