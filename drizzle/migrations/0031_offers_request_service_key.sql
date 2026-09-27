-- Amplia (sem restringir) a lista de serviços aceitos para incluir solicitações de oferta.
ALTER TABLE public.agency_site_requests DROP CONSTRAINT IF EXISTS agency_site_requests_service_key_check;
ALTER TABLE public.agency_site_requests ADD CONSTRAINT agency_site_requests_service_key_check
  CHECK (service_key = ANY (ARRAY['aereo','hospedagem','carro','transfer','ingressos','seguro','cruzeiros','pacotes','inspiracoes','oferta']::text[]));

CREATE OR REPLACE FUNCTION public.submit_offer_request(p_hostname text, p_slug text, p_payload jsonb)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_owner uuid := public.offer_owner_for_host(p_hostname);
  o public.offers;
  v_name text; v_phone text; v_email text; v_city text; v_adults int; v_kids int;
  v_key text; v_existing uuid; v_id uuid; v_client uuid; v_opp uuid; v_snap jsonb; v_link text;
BEGIN
  IF v_owner IS NULL THEN RETURN json_build_object('error', 'Site não encontrado.'); END IF;
  SELECT * INTO o FROM public.offers WHERE agency_owner_id = v_owner AND slug = lower(btrim(coalesce(p_slug,'')));
  IF o.id IS NULL OR NOT public.offer_is_live(o) THEN
    RETURN json_build_object('error', 'Esta oferta não está mais disponível para solicitação.');
  END IF;

  v_name := nullif(btrim(coalesce(p_payload->>'lead_name','')), '');
  v_phone := regexp_replace(coalesce(p_payload->>'lead_phone',''), '[^0-9]', '', 'g');
  v_email := lower(nullif(btrim(coalesce(p_payload->>'lead_email','')), ''));
  v_city := left(nullif(btrim(coalesce(p_payload->>'departure_city','')), ''), 120);
  v_adults := nullif(regexp_replace(coalesce(p_payload->>'adults',''), '[^0-9]', '', 'g'), '')::int;
  v_kids := nullif(regexp_replace(coalesce(p_payload->>'children',''), '[^0-9]', '', 'g'), '')::int;

  IF v_name IS NULL OR length(v_name) < 2 THEN RETURN json_build_object('error', 'Informe seu nome completo.'); END IF;
  IF length(v_phone) < 10 OR length(v_phone) > 15 THEN RETURN json_build_object('error', 'Informe um WhatsApp válido com DDD.'); END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN RETURN json_build_object('error', 'Informe um e-mail válido.'); END IF;
  IF v_adults IS NULL OR v_adults < 1 OR v_adults > 30 THEN RETURN json_build_object('error', 'Informe a quantidade de adultos.'); END IF;
  IF v_kids IS NULL OR v_kids < 0 OR v_kids > 20 THEN RETURN json_build_object('error', 'Informe a quantidade de crianças.'); END IF;
  IF v_city IS NULL THEN RETURN json_build_object('error', 'Informe a cidade de saída.'); END IF;
  IF (p_payload->>'consent') IS DISTINCT FROM 'true' THEN
    RETURN json_build_object('error', 'É necessário aceitar a Política de Privacidade para enviar.');
  END IF;

  v_key := nullif(btrim(coalesce(p_payload->>'idempotency_key','')), '');
  IF v_key IS NOT NULL THEN
    SELECT id INTO v_existing FROM public.agency_site_requests WHERE agency_user_id = v_owner AND idempotency_key = v_key LIMIT 1;
    IF v_existing IS NOT NULL THEN RETURN json_build_object('request_id', v_existing, 'duplicate', true); END IF;
  END IF;
  SELECT id INTO v_existing FROM public.agency_site_requests
   WHERE agency_user_id = v_owner AND offer_id = o.id
     AND public._normalize_phone(lead_phone) = public._normalize_phone(v_phone)
     AND created_at > now() - interval '10 minutes'
   ORDER BY created_at DESC LIMIT 1;
  IF v_existing IS NOT NULL THEN RETURN json_build_object('request_id', v_existing, 'duplicate', true); END IF;

  v_link := left(nullif(btrim(coalesce(p_payload->>'source_url','')), ''), 500);
  v_snap := jsonb_build_object(
    'offer_id', o.id, 'slug', o.slug, 'title', o.title, 'destination', o.destination,
    'travel_start', o.travel_start, 'travel_end', o.travel_end, 'nights', o.nights,
    'price_mode', o.price_mode,
    'price_from', CASE WHEN o.price_mode = 'fixed' THEN o.price_from END,
    'currency', o.currency, 'price_note', o.price_note,
    'payment_conditions', o.payment_conditions,
    'included_services', o.included_services,
    'expires_at', o.expires_at, 'departure_city', v_city,
    'link', v_link, 'captured_at', now()
  );

  INSERT INTO public.agency_site_requests (
    agency_user_id, hostname, service_key, service_label, lead_name, lead_phone, lead_email,
    preferred_channel, destination, summary, details, notes, consent_at, consent_version,
    source_url, utm, session_id, idempotency_key, offer_id, offer_snapshot
  ) VALUES (
    v_owner, lower(btrim(p_hostname)), 'oferta', 'Oferta do Site', left(v_name,200), v_phone, left(v_email,200),
    'whatsapp', left(o.destination, 300), left('Oferta: ' || o.title, 2000),
    jsonb_strip_nulls(jsonb_build_object(
      'ctx_destino', o.destination, 'ctx_adultos', v_adults::text, 'ctx_criancas', v_kids::text,
      'ctx_data_inicio', o.travel_start::text, 'ctx_data_fim', o.travel_end::text,
      'cidade_saida', v_city, 'oferta_titulo', left(o.title,200), 'oferta_link', v_link)),
    left(nullif(btrim(coalesce(p_payload->>'notes','')), ''), 2000),
    now(), left(coalesce(p_payload->>'consent_version','oferta-v1'), 20),
    v_link, CASE WHEN p_payload ? 'utm' THEN p_payload->'utm' END,
    left(nullif(btrim(coalesce(p_payload->>'session_id','')), ''), 100), v_key, o.id, v_snap
  ) RETURNING id INTO v_id;

  PERFORM set_config('app.offer_sync', 'on', true);
  UPDATE public.offers SET requests_count = requests_count + 1 WHERE id = o.id;
  PERFORM set_config('app.offer_sync', 'off', true);

  BEGIN
    SELECT client_id, opportunity_id INTO v_client, v_opp
      FROM public.ensure_client_and_opportunity_for_lead(v_owner, v_name, v_phone, v_email, o.destination);
    UPDATE public.agency_site_requests SET client_id = v_client, opportunity_id = v_opp WHERE id = v_id;
    IF v_opp IS NOT NULL THEN PERFORM public.apply_agency_request_to_opportunity(v_id, v_opp); END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'CRM sync failed for offer request %: %', v_id, SQLERRM;
  END;

  RETURN json_build_object('request_id', v_id, 'duplicate', false);
END;
$$;
REVOKE ALL ON FUNCTION public.submit_offer_request(text, text, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_offer_request(text, text, jsonb) TO service_role;
