ALTER TABLE public.learning_trails 
ADD COLUMN IF NOT EXISTS certificate_available boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.learning_trails.certificate_available IS 'Quando false, a Prova Final e o Certificado da trilha ficam indisponíveis para os usuários.';