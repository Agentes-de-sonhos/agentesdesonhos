-- Aditivo: base de passageiros e parcelamento máximo das ofertas (valor por pessoa e "em até Nx iguais").
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS base_pax integer CHECK (base_pax IS NULL OR base_pax > 0);
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS max_installments integer CHECK (max_installments IS NULL OR max_installments BETWEEN 1 AND 48);
COMMENT ON COLUMN public.offers.base_pax IS 'Passageiros base do preço total; usado para calcular o valor por pessoa.';
COMMENT ON COLUMN public.offers.max_installments IS 'Número máximo de parcelas iguais divulgado na oferta.';

-- Snapshot público passa a expor os dois campos
CREATE OR REPLACE FUNCTION public.offer_build_public_snapshot(o public.offers)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'slug', o.slug,
    'title', o.title,
    'description', o.description,
    'cover_url', o.cover_url,
    'gallery', coalesce(o.gallery, '[]'::jsonb),
    'destination', o.destination,
    'category', o.category,
    'service_types', to_jsonb(o.service_types),
    'included_services', coalesce(o.included_services, '[]'::jsonb),
    'travel_start', o.travel_start,
    'travel_end', o.travel_end,
    'nights', o.nights,
    'price_mode', o.price_mode,
    'price_from', CASE WHEN o.price_mode = 'fixed' THEN o.price_from END,
    'currency', o.currency,
    'price_note', o.price_note,
    'base_pax', CASE WHEN o.price_mode = 'fixed' THEN o.base_pax END,
    'max_installments', CASE WHEN o.price_mode = 'fixed' THEN o.max_installments END,
    'compare_at_price', CASE WHEN o.price_mode = 'fixed' AND o.compare_at_price > o.price_from THEN o.compare_at_price END,
    'payment_conditions', o.payment_conditions,
    'publish_at', o.publish_at,
    'expires_at', o.expires_at
  )
$$;

-- Guard: edição manual dos novos campos também desativa só aquele campo
CREATE OR REPLACE FUNCTION public.offers_guard()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  v_days int;
  v_base text;
  v_slug text;
  v_i int := 0;
  v_sync boolean := coalesce(current_setting('app.offer_sync', true), '') = 'on';
  f text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := coalesce(NEW.created_by, auth.uid());
    IF NEW.slug IS NULL OR btrim(NEW.slug) = '' THEN
      v_base := nullif(public.offer_slugify(coalesce(nullif(NEW.title,''), NEW.destination, 'oferta')), '');
      v_base := coalesce(v_base, 'oferta');
      LOOP
        v_slug := v_base || '-' || substr(md5(gen_random_uuid()::text), 1, 5);
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.offers WHERE agency_owner_id = NEW.agency_owner_id AND slug = v_slug);
        v_i := v_i + 1; EXIT WHEN v_i > 10;
      END LOOP;
      NEW.slug := v_slug;
    END IF;
  ELSE
    NEW.agency_owner_id := OLD.agency_owner_id;
    NEW.source_quote_id := OLD.source_quote_id;
    NEW.origin := OLD.origin;
    NEW.slug := OLD.slug;
    NEW.created_by := OLD.created_by;
    IF NOT v_sync AND OLD.source_quote_id IS NOT NULL THEN
      IF NEW.destination IS DISTINCT FROM OLD.destination THEN f := 'destination'; NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || f)); END IF;
      IF NEW.travel_start IS DISTINCT FROM OLD.travel_start THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'travel_start'::text)); END IF;
      IF NEW.travel_end IS DISTINCT FROM OLD.travel_end THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'travel_end'::text)); END IF;
      IF NEW.nights IS DISTINCT FROM OLD.nights THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'nights'::text)); END IF;
      IF NEW.included_services IS DISTINCT FROM OLD.included_services THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'included_services'::text)); END IF;
      IF NEW.service_types IS DISTINCT FROM OLD.service_types THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'service_types'::text)); END IF;
      IF NEW.price_from IS DISTINCT FROM OLD.price_from THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'price_from'::text)); END IF;
      IF NEW.currency IS DISTINCT FROM OLD.currency THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'currency'::text)); END IF;
      IF NEW.payment_conditions IS DISTINCT FROM OLD.payment_conditions THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'payment_conditions'::text)); END IF;
      IF NEW.base_pax IS DISTINCT FROM OLD.base_pax THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'base_pax'::text)); END IF;
      IF NEW.max_installments IS DISTINCT FROM OLD.max_installments THEN NEW.customized_fields := array(SELECT DISTINCT unnest(NEW.customized_fields || 'max_installments'::text)); END IF;
    END IF;
  END IF;

  IF NEW.origin = 'quote' THEN NEW.price_mode := 'fixed'; END IF;
  IF NEW.price_mode = 'on_request' THEN NEW.compare_at_price := NULL; END IF;

  IF NEW.status IN ('published','scheduled') THEN
    IF btrim(coalesce(NEW.title,'')) = '' THEN
      RAISE EXCEPTION 'Informe o título da oferta antes de publicar.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.price_mode = 'fixed' AND (NEW.price_from IS NULL OR NEW.price_from <= 0) THEN
      RAISE EXCEPTION 'Informe um preço válido para publicar a oferta.' USING ERRCODE = 'P0001';
    END IF;
    IF NEW.origin = 'import' AND NEW.reviewed_at IS NULL THEN
      RAISE EXCEPTION 'Revise os dados importados antes de publicar.' USING ERRCODE = 'P0001';
    END IF;
    SELECT default_validity_days INTO v_days FROM public.agency_offer_settings WHERE agency_owner_id = NEW.agency_owner_id;
    v_days := coalesce(v_days, 7);
    IF NEW.status = 'published' AND (TG_OP = 'INSERT' OR OLD.status <> 'published') AND NEW.publish_at IS NULL THEN
      NEW.publish_at := now();
    END IF;
    IF NEW.publish_at IS NOT NULL AND NEW.expires_at IS NULL THEN
      NEW.expires_at := NEW.publish_at + make_interval(days => v_days);
    END IF;
  END IF;
  IF NEW.status = 'ended' AND NEW.ended_at IS NULL THEN NEW.ended_at := now(); END IF;

  NEW.updated_at := now();
  NEW.public_snapshot := public.offer_build_public_snapshot(NEW);
  RETURN NEW;
END;
$$;

-- Estrutura do orçamento passa a devolver passageiros base e parcelamento máximo
CREATE OR REPLACE FUNCTION public.offer_quote_structural(p_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes;
  v_services jsonb;
  v_types text[];
  v_price numeric;
  v_cat text;
  v_pax int;
  v_inst int;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id;
  IF q.id IS NULL THEN RETURN NULL; END IF;

  SELECT coalesce(jsonb_agg(jsonb_build_object('type', t.label, 'name', t.name, 'detail', t.detail) ORDER BY t.order_index), '[]'::jsonb),
         coalesce(array_agg(DISTINCT t.label), '{}')
    INTO v_services, v_types
  FROM (
    SELECT s.order_index,
      CASE s.service_type
        WHEN 'hotel' THEN 'Hospedagem' WHEN 'flight' THEN 'Aéreo' WHEN 'aereo' THEN 'Aéreo'
        WHEN 'cruise' THEN 'Cruzeiro' WHEN 'attraction' THEN 'Ingressos' WHEN 'ingresso' THEN 'Ingressos'
        WHEN 'car_rental' THEN 'Carro' WHEN 'locacao' THEN 'Carro' WHEN 'insurance' THEN 'Seguro'
        WHEN 'seguro' THEN 'Seguro' WHEN 'transfer' THEN 'Transfer' WHEN 'circuit' THEN 'Circuito'
        WHEN 'rail_transport' THEN 'Trem' ELSE 'Outros' END AS label,
      left(nullif(btrim(CASE s.service_type
        WHEN 'hotel' THEN s.service_data->>'hotel_name'
        WHEN 'flight' THEN s.service_data->>'airline'
        WHEN 'aereo' THEN s.service_data->>'companhia'
        WHEN 'cruise' THEN s.service_data->>'ship_name'
        WHEN 'attraction' THEN coalesce(s.service_data->>'product_name', s.service_data->>'name')
        WHEN 'ingresso' THEN s.service_data->>'name'
        WHEN 'car_rental' THEN coalesce(s.service_data->>'car_type', s.service_data->>'rental_company')
        WHEN 'locacao' THEN s.service_data->>'categoria'
        WHEN 'insurance' THEN s.service_data->>'coverage'
        WHEN 'transfer' THEN s.service_data->>'transfer_type'
        WHEN 'circuit' THEN s.service_data->>'circuit_name'
        WHEN 'rail_transport' THEN s.service_data->>'operator'
        WHEN 'other' THEN s.service_data->>'custom_title'
        ELSE NULL END), ''), 160) AS name,
      left(nullif(btrim(CASE s.service_type
        WHEN 'hotel' THEN concat_ws(' · ', s.service_data->>'city', s.service_data->>'room_type', s.service_data->>'meal_plan')
        WHEN 'flight' THEN concat_ws(' → ', s.service_data->>'origin_city', s.service_data->>'destination_city')
        WHEN 'cruise' THEN s.service_data->>'route'
        ELSE NULL END), ''), 200) AS detail
    FROM public.quote_services s WHERE s.quote_id = q.id
  ) t;

  v_price := CASE WHEN q.pricing_mode = 'package' AND coalesce(q.package_total_amount,0) > 0 THEN q.package_total_amount ELSE q.total_amount END;
  v_cat := CASE
    WHEN 'Cruzeiro' = ANY(v_types) THEN 'Cruzeiros'
    WHEN v_types = ARRAY['Hospedagem']::text[] THEN 'Hospedagem'
    ELSE 'Pacotes' END;

  v_pax := nullif(coalesce(q.adults_count,0) + coalesce(q.children_count,0), 0);

  SELECT greatest(
           coalesce(q.installments_count, 0),
           coalesce((SELECT max(s.installments) FROM public.quote_services s WHERE s.quote_id = q.id), 0)
         ) INTO v_inst;
  IF coalesce(v_inst, 0) <= 1 THEN v_inst := NULL; END IF;
  IF v_inst IS NOT NULL AND v_inst > 48 THEN v_inst := 48; END IF;

  RETURN jsonb_build_object(
    'title', left(coalesce(nullif(btrim(q.trip_title),''), q.destination), 160),
    'destination', left(q.destination, 200),
    'category', v_cat,
    'travel_start', q.start_date,
    'travel_end', q.end_date,
    'nights', CASE WHEN q.end_date >= q.start_date THEN q.end_date - q.start_date END,
    'included_services', v_services,
    'service_types', to_jsonb(v_types),
    'price_from', CASE WHEN v_price > 0 THEN round(v_price, 2) END,
    'currency', q.currency,
    'base_pax', v_pax,
    'max_installments', v_inst,
    'payment_conditions', left(nullif(btrim(coalesce(q.payment_method_label, q.payment_terms, '')), ''), 500),
    'cover_url', coalesce(q.destination_intro_images[1],
       (SELECT coalesce(s.image_url, s.image_urls[1]) FROM public.quote_services s
         WHERE s.quote_id = q.id AND coalesce(s.image_url, s.image_urls[1]) IS NOT NULL ORDER BY s.order_index LIMIT 1)),
    'price_note', 'Valor total para ' || q.adults_count || CASE WHEN q.adults_count = 1 THEN ' adulto' ELSE ' adultos' END
       || CASE WHEN q.children_count > 0 THEN ' e ' || q.children_count || CASE WHEN q.children_count = 1 THEN ' criança' ELSE ' crianças' END ELSE '' END,
    'quote_updated_at', q.updated_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.offer_quote_structural(uuid) FROM PUBLIC, anon, authenticated;

-- Sincronização híbrida cobre os novos campos
CREATE OR REPLACE FUNCTION public.offer_sync_from_quote(p_offer_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  o public.offers;
  s jsonb;
  c text[];
  v_price numeric;
  v_warn text := NULL;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id;
  IF o.id IS NULL OR o.source_quote_id IS NULL THEN RETURN; END IF;
  s := public.offer_quote_structural(o.source_quote_id);
  IF s IS NULL THEN RETURN; END IF;
  c := o.customized_fields;
  v_price := (s->>'price_from')::numeric;
  IF NOT ('price_from' = ANY(c)) AND v_price IS NULL THEN
    v_warn := 'O orçamento de origem está sem preço válido; o último preço da oferta foi mantido.';
  END IF;

  PERFORM set_config('app.offer_sync', 'on', true);
  UPDATE public.offers SET
    destination = CASE WHEN 'destination' = ANY(c) THEN destination ELSE s->>'destination' END,
    travel_start = CASE WHEN 'travel_start' = ANY(c) THEN travel_start ELSE (s->>'travel_start')::date END,
    travel_end = CASE WHEN 'travel_end' = ANY(c) THEN travel_end ELSE (s->>'travel_end')::date END,
    nights = CASE WHEN 'nights' = ANY(c) THEN nights ELSE (s->>'nights')::int END,
    included_services = CASE WHEN 'included_services' = ANY(c) THEN included_services ELSE s->'included_services' END,
    service_types = CASE WHEN 'service_types' = ANY(c) THEN service_types ELSE array(SELECT jsonb_array_elements_text(s->'service_types')) END,
    price_from = CASE WHEN 'price_from' = ANY(c) OR v_price IS NULL THEN price_from ELSE v_price END,
    currency = CASE WHEN 'currency' = ANY(c) THEN currency ELSE s->>'currency' END,
    base_pax = CASE WHEN 'base_pax' = ANY(c) THEN base_pax ELSE (s->>'base_pax')::int END,
    max_installments = CASE WHEN 'max_installments' = ANY(c) THEN max_installments ELSE (s->>'max_installments')::int END,
    payment_conditions = CASE WHEN 'payment_conditions' = ANY(c) THEN payment_conditions ELSE s->>'payment_conditions' END,
    price_note = CASE WHEN 'price_from' = ANY(c) THEN price_note ELSE s->>'price_note' END,
    sync_warning = v_warn,
    last_synced_at = now(),
    source_quote_updated_at = (s->>'quote_updated_at')::timestamptz
  WHERE id = o.id;
  PERFORM set_config('app.offer_sync', 'off', true);
END;
$$;
REVOKE ALL ON FUNCTION public.offer_sync_from_quote(uuid) FROM PUBLIC, anon, authenticated;

-- Reconstrói os snapshots já existentes com os novos campos (sem alterar status ou datas)
UPDATE public.offers SET public_snapshot = public.offer_build_public_snapshot(offers.*) WHERE true;
