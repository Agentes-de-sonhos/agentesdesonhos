ALTER TABLE public.tour_operators DROP CONSTRAINT IF EXISTS tour_operators_source_check;
ALTER TABLE public.tour_operators ADD CONSTRAINT tour_operators_source_check CHECK (
  source IS NULL
  OR source = ANY (ARRAY['manual'::text, 'travelmeet'::text, 'agency'::text])
  OR source ~ '^https://brasiltotalreceptivos\.com\.br/associados/[0-9]+$'::text
  OR source = 'https://www.receptbrasil.com.br/associados/'::text
  OR source = 'https://www.infotravel.com.br/home#tm-section-5'::text
);