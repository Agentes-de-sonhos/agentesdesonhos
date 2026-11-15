-- Orinter 14103636. The separate, grouped Happy Hotels request awaits corrected terms.
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
  IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN
    RAISE EXCEPTION 'Unexpected agency owner';
  END IF;
  INSERT INTO public.offers (
    agency_owner_id, origin, slug, status, title, description, destination, cover_url, category,
    price_mode, image_only, campaign_category, display_channels, travel_start, travel_end, nights, expires_at, cta_url
  )
  SELECT owner_id, 'manual', 'secrets-the-vine-cancun-novembro-2026', 'published', 'Secrets The Vine Cancun',
    '5 dias e 4 noites All Inclusive de 10 a 14/05/2027. Valores por pessoa em apartamento para 2 adultos. Deluxe Partial Ocean View: 15x de R$ 329 (R$ 4.935). Deluxe Ocean View: 15x de R$ 349 (R$ 5.235). Junior Suite Ocean View: 15x de R$ 549 (R$ 8.235). 5% de desconto no café da manhã romântico + degustação diária de vinhos. Aéreo e taxas à parte. Novas reservas pelo contrato direto até 30/11/2026. Campanha para viagens até 20/12/2027, com os preços indicados válidos somente de 10 a 14/05/2027. Valores sujeitos a alteração, disponibilidade e câmbio do dólar na data do pagamento. À vista ou em até 15x no cartão de crédito ou boleto multicrédito. Operadora Orinter.',
    'Cancún, México', 'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/99809a858029337d3c4e2a06bdf97badbd6870b0/public/offers/mundo-em-cores/secrets-the-vine-cancun-novembro-2026.webp', 'Resorts', 'on_request', true, 'praias', ARRAY['novembro'],
    DATE '2027-05-10', DATE '2027-05-14', 4, TIMESTAMPTZ '2026-12-01 00:00:00 America/Sao_Paulo', NULL
  WHERE NOT EXISTS (SELECT 1 FROM public.offers WHERE agency_owner_id=owner_id AND slug='secrets-the-vine-cancun-novembro-2026');
END $$;
