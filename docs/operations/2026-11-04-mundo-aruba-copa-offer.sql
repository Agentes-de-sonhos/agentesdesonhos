-- Fernando explicitly confirmed airfare included, correcting supplier footer.
-- Existing agency default controls publication validity.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN RAISE EXCEPTION 'Unexpected agency owner'; END IF;
INSERT INTO public.offers (agency_owner_id,origin,slug,status,title,description,cover_url,category,price_mode,image_only,campaign_category,display_channels,travel_start,travel_end,nights)
SELECT owner_id,'manual','aruba-copa-novembro-2026','published','Aruba com Copa Airlines',
'Aéreo Copa Airlines saindo de São Paulo incluído, 5 noites com café da manhã e traslados privativos. The Mill Resort & Suites Aruba: 15x R$ 609 (total R$ 9.135); TRYP by Wyndham Aruba, somente adultos: 15x R$ 639 (R$ 9.585); Holiday Inn Resort Aruba: 15x R$ 749 (R$ 11.235). Por pessoa em apartamento duplo. Taxas não incluídas. Consulte opção e condições de stopover no Panamá. Sujeito a câmbio, alterações e disponibilidade.',
'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/c447c3e3ac9df5b102d9739821c0d7e494590d58/public/offers/mundo-em-cores/aruba-copa-novembro-2026.webp','Pacotes','on_request',true,'praias',ARRAY['novembro'],'2027-05-06'::date,'2027-05-11'::date,5
WHERE NOT EXISTS (SELECT 1 FROM public.offers WHERE agency_owner_id=owner_id AND slug='aruba-copa-novembro-2026');
END $$;