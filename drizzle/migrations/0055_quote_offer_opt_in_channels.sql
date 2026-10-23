ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS offer_publish_opt_in boolean NOT NULL DEFAULT false;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS offer_display_channels text[] NOT NULL DEFAULT '{ofertas}';
ALTER TABLE public.quotes ALTER COLUMN offer_opt_out SET DEFAULT true;
COMMENT ON COLUMN public.quotes.offer_publish_opt_in IS 'Opt-in explícito por orçamento para virar oferta no site. Padrão desligado.';
COMMENT ON COLUMN public.quotes.offer_display_channels IS 'Páginas do site escolhidas no orçamento; copiadas para a oferta ao criá-la.';

CREATE OR REPLACE FUNCTION public.offers_channels_from_quote()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v text[];
BEGIN
  IF NEW.source_quote_id IS NOT NULL THEN
    SELECT offer_display_channels INTO v FROM public.quotes WHERE id = NEW.source_quote_id;
    IF v IS NOT NULL AND array_length(v,1) > 0 THEN NEW.display_channels := v; END IF;
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS trg_offers_channels_from_quote ON public.offers;
CREATE TRIGGER trg_offers_channels_from_quote BEFORE INSERT ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_channels_from_quote();