-- Authorized flyer publication; validity uses the existing agency default.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN RAISE EXCEPTION 'Unexpected agency owner'; END IF;
INSERT INTO public.offers (agency_owner_id,origin,slug,status,title,description,cover_url,category,price_mode,image_only,campaign_category,display_channels,travel_start,travel_end,nights)
SELECT owner_id,'manual',v.slug,'published',v.title,v.description,'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/2c26032eb0b93a31f14533f38d8ddb9ad748e20a/public/offers/mundo-em-cores/'||v.slug||'.webp','Pacotes','on_request',true,'praias',ARRAY['novembro'],'2027-04-05'::date,'2027-04-09'::date,4
FROM (VALUES
('viva-aruba-novembro-2026','Viva Aruba','4 noites com café da manhã, traslados privativos, city tour regular e catamarã Palm Pleasure com snorkel à tarde e snack. TRYP by Wyndham Aruba Adults Only: 15x R$ 359 (total R$ 5.385); Embassy Suites by Hilton Aruba Resort: 15x R$ 409 (R$ 6.135); Renaissance Wind Creek Aruba Resort: 15x R$ 549 (R$ 8.235). Por pessoa em apartamento duplo. Aéreo e taxas não incluídos. Sujeito a câmbio, alterações e disponibilidade.'),
('aruba-all-inclusive-novembro-2026','Aruba All Inclusive','4 noites All Inclusive e traslados privativos. Riu Palace Aruba, Standard: 15x R$ 599 (total R$ 8.985); Riu Palace Antillas, Junior Suites: 15x R$ 619 (total R$ 9.285). Por pessoa em apartamento duplo. Aéreo e taxas não incluídos. Sujeito a câmbio, alterações e disponibilidade.')
) v(slug,title,description)
WHERE NOT EXISTS (SELECT 1 FROM public.offers o WHERE o.agency_owner_id=owner_id AND o.slug=v.slug);
END $$;