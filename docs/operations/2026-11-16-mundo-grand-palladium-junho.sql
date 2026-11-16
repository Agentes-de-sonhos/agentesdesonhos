-- Only Grand Palladium departure 2027-06-10 selected by owner.
-- Gmail 1a1e021eee891f01, attachment WhatsApp Image 2026-11-14 at 18.27.32.jpeg.
-- Total = 15 * 379 = 5685; no Family Selection or child-gratuity claim.
-- Default agency validity applies. No other Palladium offer is changed.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN RAISE EXCEPTION 'Unexpected agency owner'; END IF;
INSERT INTO public.offers (agency_owner_id,origin,slug,status,title,description,destination,cover_url,category,price_mode,image_only,campaign_category,display_channels,travel_start,travel_end,nights,cta_url)
SELECT owner_id,'manual','grand-palladium-imbassai-2027-06-10','published','Grand Palladium Imbassaí','6 dias e 5 noites no Grand Palladium Imbassaí, Bahia, com saída em 10/06/2027. Aéreo saindo de São Paulo, 5 noites de hospedagem All Inclusive e traslados aeroporto/hotel/aeroporto. 15x de R$ 379; total R$ 5.685 por pessoa em apartamento duplo. Valores em reais. Taxas e serviços não incluídos. Valores sujeitos a alterações e disponibilidade sem prévio aviso. Válido somente para a saída indicada. Bloqueio aéreo. Promoção não cumulativa e não aplicável a grupos. Reserva sujeita à confirmação. Operado por Orinter Tour & Travel. Imagens ilustrativas.','Imbassaí, Bahia','https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/651cc237a575cbb5e0e3c8605f044d300c96a6ed/public/offers/mundo-em-cores/grand-palladium-imbassai-2027-06-10.webp','Resorts','on_request',true,'praias',ARRAY['novembro'],'2027-06-10'::date,'2027-06-15'::date,5,NULL
WHERE NOT EXISTS (SELECT 1 FROM public.offers WHERE agency_owner_id=owner_id AND slug='grand-palladium-imbassai-2027-06-10');
END $$;
