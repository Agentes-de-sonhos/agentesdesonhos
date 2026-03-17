
ALTER TABLE public.quotes 
  ADD COLUMN payment_terms text,
  ADD COLUMN valid_until date,
  ADD COLUMN validity_disclaimer text NOT NULL DEFAULT 'Valores sujeitos à alteração sem aviso prévio devido à variação cambial e disponibilidade de tarifas.';

ALTER TABLE public.quote_services
  ADD COLUMN option_label text,
  ADD COLUMN description text;
