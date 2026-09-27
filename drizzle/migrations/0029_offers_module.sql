-- Módulo Ofertas: aditivo, retrocompatível. Nenhuma exclusão.
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS offer_opt_out boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.quotes.offer_opt_out IS 'UI: "Publicar como oferta no site" desmarcado = true. Prevalece sobre a configuração da agência.';

CREATE TABLE public.agency_offer_settings (
  agency_owner_id uuid PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  auto_publish_new_quotes boolean NOT NULL DEFAULT false,
  auto_publish_since timestamptz,
  default_validity_days integer NOT NULL DEFAULT 7 CHECK (default_validity_days BETWEEN 1 AND 90),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.agency_offer_settings TO authenticated;
GRANT ALL ON public.agency_offer_settings TO service_role;
ALTER TABLE public.agency_offer_settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_owner_id uuid NOT NULL,
  created_by uuid,
  source_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL,
  origin text NOT NULL DEFAULT 'manual' CHECK (origin IN ('quote','manual','import')),
  slug text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','published','paused','expired','ended')),
  title text NOT NULL DEFAULT '',
  description text,
  cover_url text,
  gallery jsonb NOT NULL DEFAULT '[]'::jsonb,
  destination text,
  category text NOT NULL DEFAULT 'Pacotes',
  service_types text[] NOT NULL DEFAULT '{}',
  included_services jsonb NOT NULL DEFAULT '[]'::jsonb,
  travel_start date,
  travel_end date,
  nights integer,
  price_mode text NOT NULL DEFAULT 'fixed' CHECK (price_mode IN ('fixed','on_request')),
  price_from numeric(12,2) CHECK (price_from IS NULL OR price_from > 0),
  currency text NOT NULL DEFAULT 'BRL',
  price_note text,
  compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price > 0),
  payment_conditions text,
  customized_fields text[] NOT NULL DEFAULT '{}',
  last_synced_at timestamptz,
  source_quote_updated_at timestamptz,
  sync_warning text,
  reviewed_at timestamptz,
  public_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  publish_at timestamptz,
  expires_at timestamptz,
  ended_at timestamptz,
  views_count integer NOT NULL DEFAULT 0,
  requests_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_owner_id, slug)
);
CREATE INDEX offers_owner_status_idx ON public.offers (agency_owner_id, status, expires_at);
CREATE INDEX offers_source_quote_idx ON public.offers (source_quote_id);
GRANT SELECT, INSERT, UPDATE ON public.offers TO authenticated;
GRANT ALL ON public.offers TO service_role;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Acesso da agência (titular, master visível ou equipe com permissão de orçamentos)
CREATE OR REPLACE FUNCTION public.offer_agency_access(_owner uuid, _edit boolean)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT auth.uid() IS NOT NULL AND (
    auth.uid() = _owner
    OR private.agency_master_record_visible(_owner)
    OR (public.user_agency_id(auth.uid()) = _owner
        AND public.can_team(CASE WHEN _edit THEN 'quotes.edit' ELSE 'quotes.view' END))
  )
$$;

CREATE OR REPLACE FUNCTION public.offers_module_enabled(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.agency_offer_settings s WHERE s.agency_owner_id = _owner AND s.enabled)
     AND EXISTS (SELECT 1 FROM public.agency_public_domains d WHERE d.user_id = _owner AND d.is_active)
$$;

CREATE POLICY "offer settings readable by agency" ON public.agency_offer_settings
  FOR SELECT TO authenticated USING (public.offer_agency_access(agency_owner_id, false) OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "offers readable by agency" ON public.offers
  FOR SELECT TO authenticated USING (public.offer_agency_access(agency_owner_id, false));
CREATE POLICY "offers insert by agency" ON public.offers
  FOR INSERT TO authenticated WITH CHECK (public.offer_agency_access(agency_owner_id, true) AND public.offers_module_enabled(agency_owner_id));
CREATE POLICY "offers update by agency" ON public.offers
  FOR UPDATE TO authenticated USING (public.offer_agency_access(agency_owner_id, true))
  WITH CHECK (public.offer_agency_access(agency_owner_id, true));

-- Slug legível + sufixo curto
CREATE OR REPLACE FUNCTION public.offer_slugify(_t text)
RETURNS text LANGUAGE sql IMMUTABLE AS $$
  SELECT left(trim(both '-' from regexp_replace(lower(translate(coalesce(_t,''),
    'áàâãäéèêëíìîïóòôõöúùûüçñÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇÑ',
    'aaaaaeeeeiiiiooooouuuucnaaaaaeeeeiiiiooooouuuucn')), '[^a-z0-9]+', '-', 'g')), 60)
$$;

-- Cópia pública sanitizada: whitelist estrita de campos
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
    'compare_at_price', CASE WHEN o.price_mode = 'fixed' AND o.compare_at_price > o.price_from THEN o.compare_at_price END,
    'payment_conditions', o.payment_conditions,
    'publish_at', o.publish_at,
    'expires_at', o.expires_at
  )
$$;

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
    -- Edição manual de campo estrutural sincronizado: apenas esse campo deixa de sincronizar
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
CREATE TRIGGER trg_offers_guard BEFORE INSERT OR UPDATE ON public.offers
  FOR EACH ROW EXECUTE FUNCTION public.offers_guard();

-- Dados estruturais extraídos do orçamento (sem cliente, margens, fornecedor, notas, localizador)
CREATE OR REPLACE FUNCTION public.offer_quote_structural(p_quote_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes;
  v_services jsonb;
  v_types text[];
  v_price numeric;
  v_cat text;
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

-- Sincronização híbrida idempotente; nunca altera status
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
REVOKE ALL ON FUNCTION public.offer_quote_structural(uuid) FROM PUBLIC, anon, authenticated;

-- Cria oferta vinculada ao orçamento (não publica sozinha)
CREATE OR REPLACE FUNCTION public.offer_insert_from_quote(p_quote_id uuid, p_status text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  q public.quotes; s jsonb; v_id uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id;
  s := public.offer_quote_structural(p_quote_id);
  PERFORM set_config('app.offer_sync', 'on', true);
  INSERT INTO public.offers (agency_owner_id, source_quote_id, origin, status, title, cover_url, category)
  VALUES (q.user_id, q.id, 'quote', 'draft', coalesce(s->>'title', q.destination), s->>'cover_url', coalesce(s->>'category','Pacotes'))
  RETURNING id INTO v_id;
  PERFORM set_config('app.offer_sync', 'off', true);
  PERFORM public.offer_sync_from_quote(v_id);
  IF p_status = 'published' THEN
    IF (SELECT price_from FROM public.offers WHERE id = v_id) IS NOT NULL THEN
      UPDATE public.offers SET status = 'published' WHERE id = v_id;
    ELSE
      UPDATE public.offers SET sync_warning = 'Oferta mantida em rascunho: o orçamento não possui preço válido.' WHERE id = v_id;
    END IF;
  END IF;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.offer_insert_from_quote(uuid, text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.offers_on_quote_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; st public.agency_offer_settings;
BEGIN
  BEGIN
    IF NEW.offer_opt_out THEN
      -- Controle individual prevalece: oferta sai do ar (pausa reversível)
      UPDATE public.offers SET status = 'paused' WHERE source_quote_id = NEW.id AND status IN ('published','scheduled');
    END IF;
    FOR r IN SELECT id FROM public.offers WHERE source_quote_id = NEW.id LOOP
      PERFORM public.offer_sync_from_quote(r.id);
    END LOOP;
    IF NEW.status = 'published' AND NOT NEW.offer_opt_out
       AND NOT EXISTS (SELECT 1 FROM public.offers WHERE source_quote_id = NEW.id) THEN
      SELECT * INTO st FROM public.agency_offer_settings WHERE agency_owner_id = NEW.user_id;
      IF st.enabled AND st.auto_publish_new_quotes AND st.auto_publish_since IS NOT NULL
         AND NEW.created_at >= st.auto_publish_since AND public.offers_module_enabled(NEW.user_id) THEN
        PERFORM public.offer_insert_from_quote(NEW.id, 'published');
      END IF;
    END IF;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'offers sync failed for quote %: %', NEW.id, SQLERRM;
  END;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_offers_on_quote_change AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.offers_on_quote_change();

CREATE OR REPLACE FUNCTION public.offers_on_quote_service_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r record; v_q uuid := coalesce(NEW.quote_id, OLD.quote_id);
BEGIN
  BEGIN
    FOR r IN SELECT id FROM public.offers WHERE source_quote_id = v_q LOOP
      PERFORM public.offer_sync_from_quote(r.id);
    END LOOP;
  EXCEPTION WHEN others THEN
    RAISE WARNING 'offers sync failed for quote service %: %', v_q, SQLERRM;
  END;
  RETURN coalesce(NEW, OLD);
END;
$$;
CREATE TRIGGER trg_offers_on_quote_service_change AFTER INSERT OR UPDATE OR DELETE ON public.quote_services
  FOR EACH ROW EXECUTE FUNCTION public.offers_on_quote_service_change();

-- Ações da agência
CREATE OR REPLACE FUNCTION public.offer_create_from_quote(p_quote_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE q public.quotes; v_id uuid;
BEGIN
  SELECT * INTO q FROM public.quotes WHERE id = p_quote_id;
  IF q.id IS NULL OR NOT public.offer_agency_access(q.user_id, true) THEN
    RETURN json_build_object('error', 'Orçamento não encontrado.');
  END IF;
  IF NOT public.offers_module_enabled(q.user_id) THEN
    RETURN json_build_object('error', 'Ofertas não está disponível para esta agência.');
  END IF;
  IF q.status <> 'published' THEN
    RETURN json_build_object('error', 'Somente orçamentos publicados podem gerar ofertas.');
  END IF;
  IF q.offer_opt_out THEN
    RETURN json_build_object('error', 'Este orçamento está marcado para não ser publicado como oferta.');
  END IF;
  SELECT id INTO v_id FROM public.offers WHERE source_quote_id = q.id ORDER BY created_at LIMIT 1;
  IF v_id IS NOT NULL THEN RETURN json_build_object('offer_id', v_id, 'existing', true); END IF;
  v_id := public.offer_insert_from_quote(q.id, 'draft');
  RETURN json_build_object('offer_id', v_id, 'existing', false);
END;
$$;

CREATE OR REPLACE FUNCTION public.offer_restore_fields(p_offer_id uuid, p_fields text[] DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.offers;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id;
  IF o.id IS NULL OR NOT public.offer_agency_access(o.agency_owner_id, true) THEN
    RETURN json_build_object('error', 'Oferta não encontrada.');
  END IF;
  IF o.source_quote_id IS NULL THEN
    RETURN json_build_object('error', 'Esta oferta não possui orçamento de origem.');
  END IF;
  PERFORM set_config('app.offer_sync', 'on', true);
  UPDATE public.offers SET customized_fields = CASE WHEN p_fields IS NULL THEN '{}'::text[]
    ELSE array(SELECT unnest(customized_fields) EXCEPT SELECT unnest(p_fields)) END
  WHERE id = o.id;
  PERFORM set_config('app.offer_sync', 'off', true);
  PERFORM public.offer_sync_from_quote(o.id);
  RETURN json_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.offer_set_status(p_offer_id uuid, p_action text, p_days integer DEFAULT NULL)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.offers; v_days int;
BEGIN
  SELECT * INTO o FROM public.offers WHERE id = p_offer_id FOR UPDATE;
  IF o.id IS NULL OR NOT public.offer_agency_access(o.agency_owner_id, true) THEN
    RETURN json_build_object('error', 'Oferta não encontrada.');
  END IF;
  SELECT default_validity_days INTO v_days FROM public.agency_offer_settings WHERE agency_owner_id = o.agency_owner_id;
  v_days := greatest(1, least(90, coalesce(p_days, v_days, 7)));
  IF p_action IN ('publish','resume') AND o.source_quote_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.quotes WHERE id = o.source_quote_id AND (offer_opt_out OR status <> 'published')) THEN
    RETURN json_build_object('error', 'O orçamento de origem não está publicado ou está marcado para não virar oferta.');
  END IF;
  IF p_action = 'publish' THEN
    UPDATE public.offers SET status = 'published', publish_at = now(), expires_at = now() + make_interval(days => v_days), ended_at = NULL WHERE id = o.id;
  ELSIF p_action = 'resume' THEN
    IF o.status <> 'paused' THEN RETURN json_build_object('error', 'Somente ofertas pausadas podem ser retomadas.'); END IF;
    IF o.expires_at IS NOT NULL AND o.expires_at < now() THEN
      RETURN json_build_object('error', 'A validade terminou. Use "Estender validade" ou "Republicar".');
    END IF;
    UPDATE public.offers SET status = 'published' WHERE id = o.id;
  ELSIF p_action = 'pause' THEN
    IF o.status NOT IN ('published','scheduled') THEN RETURN json_build_object('error', 'Somente ofertas no ar podem ser pausadas.'); END IF;
    UPDATE public.offers SET status = 'paused' WHERE id = o.id;
  ELSIF p_action = 'end' THEN
    UPDATE public.offers SET status = 'ended', ended_at = now() WHERE id = o.id;
  ELSIF p_action = 'extend' THEN
    IF o.status NOT IN ('published','expired','paused') THEN RETURN json_build_object('error', 'Esta oferta não pode ser estendida.'); END IF;
    UPDATE public.offers SET expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(days => v_days),
      status = CASE WHEN status = 'expired' THEN 'published' ELSE status END WHERE id = o.id;
  ELSE
    RETURN json_build_object('error', 'Ação inválida.');
  END IF;
  RETURN json_build_object('ok', true);
EXCEPTION WHEN raise_exception THEN
  RETURN json_build_object('error', SQLERRM);
END;
$$;

CREATE OR REPLACE FUNCTION public.offer_settings_save(p_auto boolean, p_days integer)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_owner uuid := coalesce(public.user_agency_id(auth.uid()), auth.uid()); st public.agency_offer_settings;
BEGIN
  SELECT * INTO st FROM public.agency_offer_settings WHERE agency_owner_id = v_owner;
  IF st.agency_owner_id IS NULL OR NOT st.enabled OR NOT public.offer_agency_access(v_owner, true) THEN
    RETURN json_build_object('error', 'Ofertas não está disponível para esta agência.');
  END IF;
  UPDATE public.agency_offer_settings SET
    auto_publish_new_quotes = p_auto,
    auto_publish_since = CASE WHEN p_auto AND NOT st.auto_publish_new_quotes THEN now()
                              WHEN p_auto THEN st.auto_publish_since ELSE NULL END,
    default_validity_days = greatest(1, least(90, coalesce(p_days, st.default_validity_days))),
    updated_at = now()
  WHERE agency_owner_id = v_owner;
  RETURN json_build_object('ok', true);
END;
$$;

-- Expiração/agendamento em background
CREATE OR REPLACE FUNCTION public.process_offer_expirations()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE n int; m int;
BEGIN
  UPDATE public.offers SET status = 'published' WHERE status = 'scheduled' AND publish_at <= now();
  GET DIAGNOSTICS m = ROW_COUNT;
  UPDATE public.offers SET status = 'expired' WHERE status = 'published' AND expires_at < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n + m;
END;
$$;
REVOKE ALL ON FUNCTION public.process_offer_expirations() FROM PUBLIC, anon, authenticated;

-- Leitura pública apenas via RPC
CREATE OR REPLACE FUNCTION public.offer_owner_for_host(p_hostname text)
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT d.user_id FROM public.agency_public_domains d
  WHERE d.is_active AND d.hostname IN (lower(btrim(p_hostname)), regexp_replace(lower(btrim(p_hostname)), '^www\.', ''), 'www.' || regexp_replace(lower(btrim(p_hostname)), '^www\.', ''))
    AND public.offers_module_enabled(d.user_id)
  LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.offer_owner_for_host(text) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_public_offers(p_hostname text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce(jsonb_agg(o.public_snapshot || jsonb_build_object('status','published') ORDER BY o.publish_at DESC), '[]'::jsonb)
  FROM public.offers o
  WHERE o.agency_owner_id = public.offer_owner_for_host(p_hostname)
    AND o.status = 'published'
    AND o.publish_at <= now()
    AND o.expires_at >= now()
$$;

CREATE OR REPLACE FUNCTION public.get_public_offer_by_slug(p_hostname text, p_slug text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE o public.offers; v_owner uuid := public.offer_owner_for_host(p_hostname);
BEGIN
  IF v_owner IS NULL THEN RETURN jsonb_build_object('status','not_found'); END IF;
  SELECT * INTO o FROM public.offers WHERE agency_owner_id = v_owner AND slug = lower(btrim(p_slug));
  IF o.id IS NULL OR o.status IN ('draft','scheduled') THEN RETURN jsonb_build_object('status','not_found'); END IF;
  IF o.status = 'paused' THEN RETURN jsonb_build_object('status','paused'); END IF;
  IF o.status = 'published' AND o.expires_at >= now() THEN
    RETURN o.public_snapshot || jsonb_build_object('status','published');
  END IF;
  -- expirada (inclusive publicada vencida ainda não processada) ou encerrada
  RETURN o.public_snapshot || jsonb_build_object('status', CASE WHEN o.status = 'ended' THEN 'ended' ELSE 'expired' END);
END;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_offers(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_offer_by_slug(text, text) TO anon, authenticated;

-- Solicitações: extensão retrocompatível de agency_site_requests
ALTER TABLE public.agency_site_requests
  ADD COLUMN IF NOT EXISTS offer_id uuid REFERENCES public.offers(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS offer_snapshot jsonb,
  ADD COLUMN IF NOT EXISTS converted_quote_id uuid REFERENCES public.quotes(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS agency_site_requests_offer_idx ON public.agency_site_requests (offer_id);

CREATE OR REPLACE FUNCTION public.agency_site_requests_offer_immutable()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.offer_snapshot IS NOT NULL THEN NEW.offer_snapshot := OLD.offer_snapshot; END IF;
  IF OLD.offer_id IS NOT NULL THEN NEW.offer_id := OLD.offer_id; END IF;
  IF OLD.converted_quote_id IS NOT NULL AND NEW.converted_quote_id IS DISTINCT FROM OLD.converted_quote_id
     AND NEW.converted_quote_id IS NOT NULL THEN NEW.converted_quote_id := OLD.converted_quote_id; END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_agency_site_requests_offer_immutable BEFORE UPDATE ON public.agency_site_requests
  FOR EACH ROW EXECUTE FUNCTION public.agency_site_requests_offer_immutable();

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
  IF o.id IS NULL OR o.status <> 'published' OR o.expires_at < now() THEN
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
  -- Fotografia imutável do que o visitante viu, gerada no servidor
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

-- Conversão idempotente em orçamento rascunho
CREATE OR REPLACE FUNCTION public.create_quote_from_offer_request(p_request_id uuid)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.agency_site_requests; o public.offers; s jsonb;
  v_client uuid; v_opp uuid; v_quote uuid; v_adults int; v_kids int; v_start date; v_end date;
BEGIN
  SELECT * INTO r FROM public.agency_site_requests WHERE id = p_request_id FOR UPDATE;
  IF r.id IS NULL OR NOT public.offer_agency_access(r.agency_user_id, true) THEN
    RETURN json_build_object('error', 'Solicitação não encontrada.');
  END IF;
  IF r.offer_snapshot IS NULL THEN
    RETURN json_build_object('error', 'Esta solicitação não veio de uma oferta.');
  END IF;
  IF r.converted_quote_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.quotes WHERE id = r.converted_quote_id) THEN
    RETURN json_build_object('quote_id', r.converted_quote_id, 'existing', true);
  END IF;
  s := r.offer_snapshot;
  v_client := r.client_id; v_opp := r.opportunity_id;
  IF v_client IS NULL THEN
    SELECT client_id, opportunity_id INTO v_client, v_opp
      FROM public.ensure_client_and_opportunity_for_lead(r.agency_user_id, r.lead_name, coalesce(r.lead_phone,''), r.lead_email, r.destination);
    UPDATE public.agency_site_requests SET client_id = v_client, opportunity_id = coalesce(opportunity_id, v_opp) WHERE id = r.id;
  END IF;
  v_adults := greatest(1, coalesce(nullif(r.details->>'ctx_adultos','')::int, 1));
  v_kids := greatest(0, coalesce(nullif(r.details->>'ctx_criancas','')::int, 0));
  v_start := coalesce((s->>'travel_start')::date, current_date);
  v_end := greatest(coalesce((s->>'travel_end')::date, v_start), v_start);

  INSERT INTO public.quotes (user_id, client_name, client_id, adults_count, children_count, destination,
    start_date, end_date, total_amount, status, currency, trip_title, opportunity_id, payment_terms, offer_opt_out)
  VALUES (r.agency_user_id, r.lead_name, v_client, v_adults, v_kids,
    coalesce(nullif(s->>'destination',''), r.destination, 'A definir'), v_start, v_end,
    coalesce((s->>'price_from')::numeric, 0), 'draft', coalesce(s->>'currency','BRL'),
    left(s->>'title', 200), v_opp, s->>'payment_conditions', true)
  RETURNING id INTO v_quote;

  SELECT * INTO o FROM public.offers WHERE id = r.offer_id;
  IF o.source_quote_id IS NOT NULL THEN
    INSERT INTO public.quote_services (quote_id, service_type, service_data, amount, order_index, option_label,
      description, image_url, image_urls, is_custom_payment, payment_type, installments, entry_value,
      discount_type, discount_value, payment_method)
    SELECT v_quote, service_type, service_data, amount, order_index, option_label,
      description, image_url, image_urls, is_custom_payment, payment_type, installments, entry_value,
      discount_type, discount_value, payment_method
    FROM public.quote_services WHERE quote_id = o.source_quote_id ORDER BY order_index;
  END IF;

  UPDATE public.agency_site_requests SET converted_quote_id = v_quote WHERE id = r.id;
  RETURN json_build_object('quote_id', v_quote, 'existing', false);
END;
$$;
REVOKE ALL ON FUNCTION public.create_quote_from_offer_request(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.create_quote_from_offer_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offer_create_from_quote(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offer_restore_fields(uuid, text[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offer_set_status(uuid, text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.offer_settings_save(boolean, integer) TO authenticated;
