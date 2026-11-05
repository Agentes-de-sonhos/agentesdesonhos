-- November offers supplied by Fernando. No price or specific departure date supplied.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN RAISE EXCEPTION 'Unexpected agency owner'; END IF;
INSERT INTO public.offers (agency_owner_id,origin,slug,status,title,description,cover_url,category,price_mode,image_only,campaign_category,display_channels,nights)
SELECT owner_id,'manual',v.slug,'published',v.title,v.description,'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/47a03429aaa2e52654a25d316ba23b4e740b43b1/public/offers/mundo-em-cores/'||v.slug||'.webp','Pacotes','on_request',true,'europa',ARRAY['novembro'],v.nights
FROM (VALUES
('turquia-encantadora-novembro-2026','Turquia Encantadora','11 dias / 10 noites. Saídas em fevereiro e março de 2027. 50% OFF para o segundo passageiro. Istambul: 4 noites; Ankara: 1; Capadócia: 2; Pamukkale: 2; Kusadası ou Izmir: 1. Valores sob consulta; consulte datas, disponibilidade e condições do desconto.',10),
('lendas-turquia-novembro-2026','Lendas da Turquia','10 dias / 9 noites. Saídas em abril, maio, agosto, setembro e outubro de 2027. 25% OFF para o segundo passageiro. Istambul: 4 noites; Capadócia: 2; Pamukkale: 2; Kusadası ou Izmir: 1. Valores sob consulta; consulte datas, disponibilidade e condições do desconto.',9)
) v(slug,title,description,nights)
WHERE NOT EXISTS (SELECT 1 FROM public.offers o WHERE o.agency_owner_id=owner_id AND o.slug=v.slug);
END $$;