CREATE TABLE public.agency_resort_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resort_slug text NOT NULL,
  is_featured boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  display_order integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resort_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_resort_settings TO authenticated;
GRANT ALL ON public.agency_resort_settings TO service_role;
ALTER TABLE public.agency_resort_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own resort settings" ON public.agency_resort_settings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_agency_resort_settings(_hostname text)
RETURNS TABLE(resort_slug text, is_featured boolean, is_hidden boolean, display_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT s.resort_slug, s.is_featured, s.is_hidden, s.display_order
  FROM public.agency_resort_settings s
  WHERE s.user_id = (
    SELECT d.user_id FROM public.agency_public_domains d
    WHERE d.is_active AND lower(d.hostname) = lower(regexp_replace(_hostname, '^www\.', ''))
       OR d.is_active AND lower(d.hostname) = lower(_hostname)
    LIMIT 1)
    AND (s.is_featured OR s.is_hidden);
$$;
GRANT EXECUTE ON FUNCTION public.get_agency_resort_settings(text) TO anon, authenticated;