-- User-authorized November flyer. Validity uses agency default; supplier gives no sales deadline.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN RAISE EXCEPTION 'Unexpected agency owner'; END IF;
INSERT INTO public.offers (agency_owner_id,origin,slug,status,title,description,cover_url,category,price_mode,image_only,campaign_category,display_channels,travel_start,nights)
SELECT owner_id,'manual','hotel-pipa-atlantico-novembro-2026','published','Hotel Pipa Atlântico',
'Pipa/RN. Saída em 02/06/2027, 6 dias / 5 noites. Passagem aérea saindo de São Paulo via aeroporto de Natal, traslados aeroporto/hotel/aeroporto e hospedagem com café da manhã. 15x de R$ 190; total R$ 2.850 por pessoa em apartamento duplo. Taxas e serviços não incluídos. Sujeito a alterações e disponibilidade. Promoção não cumulativa e não aplicável a grupos. Operado por Orinter Tour & Travel.',
'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/237c799fbe3ed11d4d4161b5415f450af256fb56/public/offers/mundo-em-cores/hotel-pipa-atlantico-novembro-2026.webp','Pacotes','on_request',true,'brasil',ARRAY['novembro'],'2027-06-02'::date,5
WHERE NOT EXISTS (SELECT 1 FROM public.offers WHERE agency_owner_id=owner_id AND slug='hotel-pipa-atlantico-novembro-2026');
END $$;