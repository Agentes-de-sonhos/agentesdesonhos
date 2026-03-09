
-- Add certificate_pdf_url to user_certificates
ALTER TABLE public.user_certificates ADD COLUMN IF NOT EXISTS certificate_pdf_url text;

-- Create a sequence for certificate numbers
CREATE SEQUENCE IF NOT EXISTS public.certificate_number_seq START WITH 1;

-- Function to generate certificate number in EA-YEAR-XXXXXX format
CREATE OR REPLACE FUNCTION public.generate_certificate_number()
RETURNS text
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  seq_val integer;
BEGIN
  seq_val := nextval('public.certificate_number_seq');
  RETURN 'EA-' || EXTRACT(YEAR FROM now())::text || '-' || lpad(seq_val::text, 6, '0');
END;
$$;
