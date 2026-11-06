-- Verified Gmail message 1a1ae5527e5b4bcf, image0.jpeg.
-- image1.jpeg (Maceio) remains pending: installment total disagrees with stated total.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN RAISE EXCEPTION 'Unexpected agency owner'; END IF;
INSERT INTO public.offers (agency_owner_id,origin,slug,status,title,description,destination,cover_url,category,price_mode,image_only,campaign_category,display_channels,travel_start,travel_end,nights,expires_at,cta_url)
SELECT owner_id,'manual','the-fives-riviera-maya-novembro-2026','published',
'Riviera Maya • The Fives Beach Hotel & Residences',
'25 a 30 de janeiro de 2027. 6 dias e 5 noites com All Inclusive. Cobertura com 1 quarto. 15x de R$ 489, total R$ 7.335 por adulto, em apartamento para 2 adultos e 2 crianças de até 16 anos. Até 2 crianças grátis com mínimo de 5 noites e Resort Credit de USD 555 com mínimo de 4 noites, benefícios válidos somente em reservas no contrato direto. Reservas até 30/11/2026. Campanha para viagens entre 01/11/2026 e 31/03/2027, preço de referência para 25 a 30/01/2027. Aéreo e taxas não incluídos. Valores sujeitos a disponibilidade, alteração e conversão do dólar no câmbio do pagamento. Pagamento à vista ou em até 15x no cartão ou boleto multicrédito. Operadora Orinter. Referência 14001225.',
'Riviera Maya, México',
'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/6c00ecb52b157a3344535d9796e462bb92f113b8/public/offers/mundo-em-cores/the-fives-riviera-maya-novembro-2026.webp',
'Pacotes','on_request',true,'praias',ARRAY['novembro'],DATE '2027-01-25',DATE '2027-01-30',5,TIMESTAMPTZ '2026-12-01 00:00:00 America/Sao_Paulo',NULL
WHERE NOT EXISTS (SELECT 1 FROM public.offers WHERE agency_owner_id=owner_id AND slug='the-fives-riviera-maya-novembro-2026');
END $$;
