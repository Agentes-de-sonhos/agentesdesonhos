-- Requested by Fernando: publish the two approved flyers for O Mundo em Cores.
-- Idempotent; uses the existing offer snapshot trigger and November channel.
BEGIN;
DO $$
DECLARE owner_id uuid := public.offer_owner_for_host('omundoemcores.com.br');
BEGIN
  IF owner_id IS DISTINCT FROM '428500de-552a-411b-9663-71f8bb2e4f37'::uuid THEN
    RAISE EXCEPTION 'Unexpected agency owner';
  END IF;
  INSERT INTO public.offers (
    agency_owner_id, origin, slug, status, title, description, cover_url,
    category, price_mode, image_only, campaign_category, display_channels, expires_at
  )
  SELECT owner_id, 'manual', v.slug, 'published', v.title, v.description,
    'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/dd78b9e4e21cfcdc3c62cd5a7b301fe015c26339/public/offers/mundo-em-cores/' || v.slug || '.webp',
    'Pacotes', 'on_request', true, 'europa', ARRAY['novembro'],
    '2026-12-01 00:00:00-03'::timestamptz
  FROM (VALUES
    ('cinque-terre-novembro-2026', 'Cinque Terre Inesquecível',
     'Saída em 02/04/2027. 7 dias / 6 noites, hotéis 4 estrelas. A partir de 15x de R$ 849 por pessoa em apartamento duplo (total R$ 12.735). Taxas não incluídas. Consulte condições.'),
    ('passeios-porto-novembro-2026', 'Passeios no Porto',
     'Douro Wine Experience com passeio de barco a partir de R$ 399 por pessoa; passeio panorâmico pelo Porto com cruzeiro a partir de R$ 259 por pessoa. Passeios regulares com guia em português. Taxas não incluídas. Consulte condições.')
  ) AS v(slug, title, description)
  WHERE NOT EXISTS (
    SELECT 1 FROM public.offers o WHERE o.agency_owner_id=owner_id AND o.slug=v.slug
  );
END $$;
-- Pin approved assets to their immutable GitHub commit, independent of hosting deploys.
UPDATE public.offers SET cover_url = 'https://raw.githubusercontent.com/Agentes-de-sonhos/agentesdesonhos/dd78b9e4e21cfcdc3c62cd5a7b301fe015c26339/public/offers/mundo-em-cores/' || slug || '.webp' WHERE agency_owner_id = public.offer_owner_for_host('omundoemcores.com.br') AND slug IN ('cinque-terre-novembro-2026', 'passeios-porto-novembro-2026');
COMMIT;
