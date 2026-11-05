-- O Mundo em Cores · November campaign, verified supplier flyers.
-- NULL expiry delegates to the agency's current validity rule.
-- Peru has no matching campaign category; keep the general placement.
DO $$
DECLARE
  owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
  IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN
    RAISE EXCEPTION 'Unexpected agency owner';
  END IF;
  INSERT INTO public.offers (
    agency_owner_id, slug, title, destination, description, origin, status,
    cover_url, category, price_mode, image_only, campaign_category,
    display_channels, travel_start, travel_end, nights, expires_at, cta_url
  )
  SELECT owner_id, v.slug, v.title, v.destination, v.description, 'manual', 'published',
    'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/e334521b4befe5973d84820fa1a214ab5affb994/public/offers/mundo-em-cores/' || v.slug || '.webp',
    'Pacotes', 'on_request', true, v.campaign_category, ARRAY['novembro'], DATE '2027-04-02',
    DATE '2027-04-02' + v.nights, v.nights, v.expires_at, NULL
  FROM (VALUES
    ('costa-amalfitana-inesquecivel-novembro-2026', 'Costa Amalfitana Inesquecível', 'Roma, Sorrento e Costa Amalfitana, Itália',
     '7 dias e 6 noites em hotéis 4 estrelas, com café da manhã diário. Roma (1 noite), Sorrento (2), região de Amalfi (2) e Roma (1). Passeio regular a Capri com Gruta Azul em espanhol, conforme o clima. Trem Roma–Nápoles–Roma em 2ª classe e traslados regulares de chegada, saída e entre hotéis e estações conforme o roteiro. De 15x de R$ 869 por 15x de R$ 799 (total R$ 11.985 por pessoa em apartamento duplo standard). Desconto de até 8%. Compras de 01 a 30/11/2026, sujeitas a disponibilidade, estoque e câmbio do euro no pagamento. Taxas à parte. Pagamento à vista ou em até 15x no cartão ou boleto bancário. Operadora Orinter.',
     'europa', 6, TIMESTAMPTZ '2026-12-01 00:00:00 America/Sao_Paulo'),
    ('peru-maravilhas-incas-novembro-2026', 'Peru • Maravilhas Incas', 'Lima, Cusco e Machu Picchu, Peru',
     '6 dias e 5 noites em hotéis de primeira categoria, com café da manhã. Lima (2 noites) e Cusco (3). Traslados aeroporto–hotel–aeroporto e city tours nas duas cidades. Visitas ao Parque Arqueológico de Sacsayhuamán e a Machu Picchu com o trem Expedition. De 15x de R$ 549 por 15x de R$ 219 (total R$ 3.285 por pessoa em apartamento duplo). Desconto de até 60%. Aéreo e taxas à parte. Sujeito a disponibilidade e câmbio do dólar no pagamento. Pagamento à vista ou em até 15x no cartão ou boleto bancário. Operadora Orinter.',
     NULL, 5, NULL)
  ) AS v(slug, title, destination, description, campaign_category, nights, expires_at)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.offers o WHERE o.agency_owner_id = owner_id AND o.slug = v.slug
  );
END $$;
