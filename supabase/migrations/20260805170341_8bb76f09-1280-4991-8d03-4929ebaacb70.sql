CREATE TABLE public.quote_sections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  title text NOT NULL,
  order_index integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quote_sections_title_not_blank CHECK (btrim(title) <> '')
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_sections TO authenticated;
GRANT SELECT ON public.quote_sections TO anon;
GRANT ALL ON public.quote_sections TO service_role;

ALTER TABLE public.quote_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage sections of their quotes"
ON public.quote_sections
FOR ALL
USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_sections.quote_id AND q.user_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_sections.quote_id AND q.user_id = auth.uid()));

CREATE POLICY "Public can view sections of published quotes with valid token"
ON public.quote_sections
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.quotes q
  WHERE q.id = quote_sections.quote_id
    AND q.status = 'published'
    AND q.share_token IS NOT NULL
    AND length(q.share_token) >= 32
    AND (q.share_expires_at IS NULL OR q.share_expires_at > now())
));

CREATE INDEX idx_quote_sections_quote_order ON public.quote_sections (quote_id, order_index);

CREATE TRIGGER update_quote_sections_updated_at
BEFORE UPDATE ON public.quote_sections
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.quote_services
  ADD COLUMN section_id uuid REFERENCES public.quote_sections(id) ON DELETE SET NULL;

CREATE INDEX idx_quote_services_section ON public.quote_services (section_id);

CREATE OR REPLACE FUNCTION public.get_quote_by_public_code(p_agency_slug text, p_code text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  quote_record RECORD;
  agent_record RECORD;
  services_data json;
  sections_data json;
  agent_profile json;
  agency_slug_check text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN json_build_object('error', 'Link inválido');
  END IF;

  SELECT * INTO quote_record
  FROM public.quotes
  WHERE public_access_code = p_code
    AND status = 'published';

  IF quote_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT * INTO agent_record
  FROM public.profiles
  WHERE user_id = quote_record.user_id;

  IF agent_record IS NULL THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  agency_slug_check := lower(public.unaccent(COALESCE(agent_record.agency_name, '')));
  agency_slug_check := regexp_replace(agency_slug_check, '[^a-z0-9\-]', '-', 'g');
  agency_slug_check := regexp_replace(agency_slug_check, '-+', '-', 'g');
  agency_slug_check := trim(both '-' from agency_slug_check);

  IF agency_slug_check != p_agency_slug THEN
    RETURN json_build_object('error', 'Orçamento não encontrado');
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
  FROM public.quote_services s WHERE s.quote_id = quote_record.id;

  SELECT json_agg(json_build_object(
    'id', sec.id,
    'quote_id', sec.quote_id,
    'title', sec.title,
    'order_index', sec.order_index
  ) ORDER BY sec.order_index) INTO sections_data
  FROM public.quote_sections sec WHERE sec.quote_id = quote_record.id;

  agent_profile := json_build_object(
    'name', agent_record.name, 'phone', agent_record.phone,
    'avatar_url', agent_record.avatar_url,
    'agency_name', agent_record.agency_name,
    'agency_logo_url', agent_record.agency_logo_url,
    'city', agent_record.city, 'state', agent_record.state
  );

  RETURN json_build_object(
    'quote', row_to_json(quote_record),
    'services', COALESCE(services_data, '[]'::json),
    'sections', COALESCE(sections_data, '[]'::json),
    'agent_profile', agent_profile
  );
END;
$function$;