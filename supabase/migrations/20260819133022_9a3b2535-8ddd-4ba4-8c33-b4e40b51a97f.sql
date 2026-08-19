-- =====================================================================
-- FILE / PROCESSO DE RESERVA — nucleo, numeracao, criacao idempotente,
-- protecao de exclusao do orcamento e backfill nao destrutivo.
-- Nada e excluido. Snapshots e protocolos antigos preservados.
-- =====================================================================

-- ---------- contador por agencia ----------
CREATE TABLE IF NOT EXISTS public.agency_file_counters (
  agency_id uuid PRIMARY KEY,
  last_number integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.agency_file_counters TO authenticated;
GRANT ALL ON public.agency_file_counters TO service_role;
ALTER TABLE public.agency_file_counters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_view_file_counter"
ON public.agency_file_counters FOR SELECT TO authenticated
USING (public.is_agency_member(agency_id));

-- ---------- files ----------
CREATE TABLE IF NOT EXISTS public.travel_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  file_number integer NOT NULL,
  file_number_display text GENERATED ALWAYS AS (lpad(file_number::text, 7, '0')) STORED,
  client_id uuid,
  opportunity_id uuid,
  quote_id uuid,
  root_request_id uuid NOT NULL,
  current_request_id uuid,
  revision integer NOT NULL DEFAULT 1,
  protocol_snapshot text,
  responsible_user_id uuid,
  responsible_team_member_id uuid,
  original_responsible_team_member_id uuid,
  operations_responsible_team_member_id uuid,
  primary_destination text,
  destinations text[] NOT NULL DEFAULT '{}',
  start_date date,
  end_date date,
  adults_count integer NOT NULL DEFAULT 1,
  children_count integer NOT NULL DEFAULT 0,
  passengers_count integer NOT NULL DEFAULT 1,
  passengers_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'BRL',
  pricing_mode text NOT NULL DEFAULT 'itemized',
  requested_amount numeric NOT NULL DEFAULT 0,
  reconfirmed_amount numeric,
  final_sale_amount numeric,
  status text NOT NULL DEFAULT 'request_received',
  operational_status text NOT NULL DEFAULT 'not_started',
  financial_status text NOT NULL DEFAULT 'none',
  operation_id uuid,
  opened_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  cancelled_at timestamptz,
  completed_at timestamptz,
  cancellation_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT travel_files_number_unique UNIQUE (agency_id, file_number),
  CONSTRAINT travel_files_root_unique UNIQUE (root_request_id),
  CONSTRAINT travel_files_status_check CHECK (status IN (
    'request_received','awaiting_reconfirmation','partially_available',
    'awaiting_client','sale_confirmed','in_operation','trip_completed','cancelled'
  )),
  CONSTRAINT travel_files_operational_status_check CHECK (operational_status IN (
    'not_started','in_progress','completed','cancelled'
  )),
  CONSTRAINT travel_files_financial_status_check CHECK (financial_status IN (
    'none','pending','partial','settled','cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS travel_files_agency_idx ON public.travel_files (agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS travel_files_number_idx ON public.travel_files (agency_id, file_number DESC);
CREATE INDEX IF NOT EXISTS travel_files_client_idx ON public.travel_files (client_id);
CREATE INDEX IF NOT EXISTS travel_files_status_idx ON public.travel_files (agency_id, status);
CREATE INDEX IF NOT EXISTS travel_files_period_idx ON public.travel_files (agency_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS travel_files_responsible_idx ON public.travel_files (responsible_team_member_id);
CREATE INDEX IF NOT EXISTS travel_files_quote_idx ON public.travel_files (quote_id);

GRANT SELECT, INSERT, UPDATE ON public.travel_files TO authenticated;
GRANT ALL ON public.travel_files TO service_role;
ALTER TABLE public.travel_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_view_files"
ON public.travel_files FOR SELECT TO authenticated
USING (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "agency_members_update_files"
ON public.travel_files FOR UPDATE TO authenticated
USING (public.is_agency_member(agency_id))
WITH CHECK (public.is_agency_member(agency_id));

-- ---------- servicos do file ----------
CREATE TABLE IF NOT EXISTS public.travel_file_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.travel_files(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  request_item_id uuid,
  source_quote_service_id uuid,
  service_type text NOT NULL,
  product_name text NOT NULL,
  supplier_name text,
  supplier_id uuid,
  city text,
  destination text,
  country text,
  start_date date,
  end_date date,
  quantity integer NOT NULL DEFAULT 1,
  passengers_count integer,
  passengers_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  currency text NOT NULL DEFAULT 'BRL',
  requested_amount numeric NOT NULL DEFAULT 0,
  reconfirmed_amount numeric,
  sold_amount numeric,
  cost_amount numeric,
  commission_amount numeric,
  responsible_team_member_id uuid,
  is_required boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'requested',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT travel_file_services_item_unique UNIQUE (request_item_id),
  CONSTRAINT travel_file_services_status_check CHECK (status IN (
    'requested','reconfirming','available','amount_changed','unavailable',
    'awaiting_client','booked','paid','issued','delivered','cancelled'
  ))
);

CREATE INDEX IF NOT EXISTS travel_file_services_file_idx ON public.travel_file_services (file_id);
CREATE INDEX IF NOT EXISTS travel_file_services_agency_idx ON public.travel_file_services (agency_id, service_type);

GRANT SELECT, INSERT, UPDATE ON public.travel_file_services TO authenticated;
GRANT ALL ON public.travel_file_services TO service_role;
ALTER TABLE public.travel_file_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_members_view_file_services"
ON public.travel_file_services FOR SELECT TO authenticated
USING (public.is_agency_member(agency_id) OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "agency_members_update_file_services"
ON public.travel_file_services FOR UPDATE TO authenticated
USING (public.is_agency_member(agency_id))
WITH CHECK (public.is_agency_member(agency_id));

-- ---------- visualizacoes por usuario ----------
CREATE TABLE IF NOT EXISTS public.travel_file_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id uuid NOT NULL REFERENCES public.travel_files(id) ON DELETE CASCADE,
  agency_id uuid NOT NULL,
  user_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT travel_file_views_unique UNIQUE (file_id, user_id)
);

GRANT SELECT, INSERT, UPDATE ON public.travel_file_views TO authenticated;
GRANT ALL ON public.travel_file_views TO service_role;
ALTER TABLE public.travel_file_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_file_views_select"
ON public.travel_file_views FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "own_file_views_insert"
ON public.travel_file_views FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_agency_member(agency_id));

CREATE POLICY "own_file_views_update"
ON public.travel_file_views FOR UPDATE TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ---------- updated_at ----------
CREATE TRIGGER travel_files_set_updated_at
BEFORE UPDATE ON public.travel_files
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER travel_file_services_set_updated_at
BEFORE UPDATE ON public.travel_file_services
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- numeracao transacional por agencia ----------
CREATE OR REPLACE FUNCTION public.next_agency_file_number(p_agency_id uuid)
RETURNS integer
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_next integer;
BEGIN
  IF p_agency_id IS NULL THEN
    RAISE EXCEPTION 'agency_id obrigatorio para gerar numero de file';
  END IF;

  INSERT INTO public.agency_file_counters (agency_id, last_number)
  VALUES (p_agency_id, 1)
  ON CONFLICT (agency_id) DO UPDATE
    SET last_number = public.agency_file_counters.last_number + 1,
        updated_at = now()
  RETURNING last_number INTO v_next;

  RETURN v_next;
END;
$$;

REVOKE ALL ON FUNCTION public.next_agency_file_number(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.next_agency_file_number(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.next_agency_file_number(uuid) TO service_role;

-- ---------- criacao / sincronizacao idempotente do file ----------
CREATE OR REPLACE FUNCTION public.ensure_travel_file(p_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_req RECORD;
  v_root uuid;
  v_root_req RECORD;
  v_quote RECORD;
  v_file RECORD;
  v_file_id uuid;
  v_number integer;
  v_agency uuid;
  v_total numeric := 0;
  v_items_sum numeric := 0;
  v_responsible uuid;
  v_client uuid;
BEGIN
  SELECT * INTO v_req FROM public.quote_booking_requests WHERE id = p_request_id;
  IF v_req.id IS NULL THEN RETURN NULL; END IF;

  v_root := COALESCE(v_req.root_request_id, v_req.id);
  SELECT * INTO v_root_req FROM public.quote_booking_requests WHERE id = v_root;
  SELECT * INTO v_quote FROM public.quotes WHERE id = v_req.quote_id;
  v_agency := COALESCE(v_req.agency_id, v_req.user_id, v_quote.user_id);
  IF v_agency IS NULL THEN RETURN NULL; END IF;

  v_client := COALESCE(v_quote.client_id, v_req.client_id);

  SELECT COALESCE(sum(i.amount_snapshot * GREATEST(i.quantity, 1)), 0)
    INTO v_items_sum
  FROM public.quote_booking_request_items i WHERE i.request_id = v_req.id;

  IF COALESCE(v_quote.pricing_mode, 'itemized') = 'package' THEN
    v_total := COALESCE(
      NULLIF(v_quote.package_total_amount, 0),
      NULLIF(v_quote.total_amount, 0),
      NULLIF(v_req.total_estimated, 0),
      v_items_sum
    );
  ELSE
    v_total := COALESCE(NULLIF(v_items_sum, 0), NULLIF(v_req.total_estimated, 0), 0);
  END IF;

  -- responsavel comercial deterministico: oportunidade > cliente > null
  SELECT o.assigned_team_member_id INTO v_responsible
  FROM public.opportunities o
  WHERE o.id = COALESCE(v_quote.opportunity_id, v_req.opportunity_id);
  IF v_responsible IS NULL AND v_client IS NOT NULL THEN
    SELECT c.assigned_team_member_id INTO v_responsible FROM public.clients c WHERE c.id = v_client;
  END IF;

  -- ja existe file para a solicitacao raiz? entao apenas sincroniza (idempotente)
  SELECT * INTO v_file FROM public.travel_files WHERE root_request_id = v_root FOR UPDATE;

  IF v_file.id IS NULL THEN
    v_number := public.next_agency_file_number(v_agency);
    INSERT INTO public.travel_files (
      agency_id, file_number, client_id, opportunity_id, quote_id,
      root_request_id, current_request_id, revision, protocol_snapshot,
      responsible_user_id, responsible_team_member_id, original_responsible_team_member_id,
      primary_destination, destinations, start_date, end_date,
      adults_count, children_count, passengers_count, passengers_snapshot,
      currency, pricing_mode, requested_amount, status, opened_at
    ) VALUES (
      v_agency, v_number, v_client,
      COALESCE(v_quote.opportunity_id, v_req.opportunity_id), v_req.quote_id,
      v_root, v_req.id, GREATEST(COALESCE(v_req.version, 1), 1),
      COALESCE(v_root_req.protocol, v_req.protocol),
      v_agency, v_responsible, v_responsible,
      NULLIF(btrim(COALESCE(v_quote.destination, '')), ''),
      CASE WHEN NULLIF(btrim(COALESCE(v_quote.destination, '')), '') IS NULL
           THEN '{}'::text[] ELSE ARRAY[btrim(v_quote.destination)] END,
      v_quote.start_date, v_quote.end_date,
      GREATEST(COALESCE(v_quote.adults_count, 1), 1), COALESCE(v_quote.children_count, 0),
      GREATEST(COALESCE(v_quote.adults_count, 1), 1) + COALESCE(v_quote.children_count, 0),
      jsonb_build_object('adults', GREATEST(COALESCE(v_quote.adults_count, 1), 1),
                         'children', COALESCE(v_quote.children_count, 0)),
      COALESCE(v_req.currency, v_quote.currency, 'BRL'),
      COALESCE(v_quote.pricing_mode, 'itemized'),
      GREATEST(COALESCE(v_total, 0), 0), 'request_received',
      COALESCE(v_root_req.created_at, v_req.created_at, now())
    )
    RETURNING id INTO v_file_id;
  ELSE
    v_file_id := v_file.id;
    UPDATE public.travel_files f
    SET current_request_id = v_req.id,
        revision = GREATEST(COALESCE(v_req.version, 1), f.revision),
        client_id = COALESCE(f.client_id, v_client),
        opportunity_id = COALESCE(v_quote.opportunity_id, v_req.opportunity_id, f.opportunity_id),
        requested_amount = GREATEST(COALESCE(v_total, f.requested_amount, 0), 0),
        currency = COALESCE(v_req.currency, f.currency),
        updated_at = now()
    WHERE f.id = v_file_id;
  END IF;

  -- servicos: somente os itens efetivamente solicitados (selecionados + obrigatorios)
  INSERT INTO public.travel_file_services (
    file_id, agency_id, request_item_id, source_quote_service_id, service_type,
    product_name, supplier_name, city, destination, country,
    start_date, end_date, quantity, passengers_count, currency,
    requested_amount, responsible_team_member_id, is_required, snapshot
  )
  SELECT
    v_file_id, v_agency, i.id, i.source_quote_service_id, i.service_type,
    i.service_name,
    NULLIF(btrim(COALESCE(i.snapshot->>'supplier', i.snapshot->>'operator', i.snapshot->>'company', '')), ''),
    NULLIF(btrim(COALESCE(i.snapshot->>'city', '')), ''),
    NULLIF(btrim(COALESCE(i.snapshot->>'destination', v_quote.destination, '')), ''),
    NULLIF(btrim(COALESCE(i.snapshot->>'country', '')), ''),
    NULLIF(COALESCE(i.snapshot->>'start_date', i.snapshot->>'check_in', i.snapshot->>'date'), '')::date,
    NULLIF(COALESCE(i.snapshot->>'end_date', i.snapshot->>'check_out'), '')::date,
    GREATEST(COALESCE(i.quantity, 1), 1),
    GREATEST(COALESCE(v_quote.adults_count, 1), 1) + COALESCE(v_quote.children_count, 0),
    COALESCE(v_req.currency, v_quote.currency, 'BRL'),
    COALESCE(i.amount_snapshot, 0), v_responsible,
    COALESCE(i.selection_mode_snapshot, 'optional') = 'required',
    i.snapshot
  FROM public.quote_booking_request_items i
  WHERE i.request_id = v_req.id
  ON CONFLICT (request_item_id) DO NOTHING;

  -- etiqueta de origem no orcamento: nunca substitui o status Publicado
  UPDATE public.quotes SET updated_at = now() WHERE id = v_req.quote_id AND false;

  RETURN v_file_id;
EXCEPTION WHEN others THEN
  -- a criacao do file nunca pode impedir a gravacao da solicitacao do cliente
  RAISE WARNING 'ensure_travel_file falhou para %: %', p_request_id, SQLERRM;
  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_travel_file(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_travel_file(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ensure_travel_file(uuid) TO service_role;

-- ---------- gatilho: toda solicitacao gravada abre/sincroniza o file ----------
CREATE OR REPLACE FUNCTION public.trg_ensure_travel_file()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.ensure_travel_file(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quote_booking_requests_ensure_file ON public.quote_booking_requests;
CREATE TRIGGER quote_booking_requests_ensure_file
AFTER INSERT ON public.quote_booking_requests
FOR EACH ROW EXECUTE FUNCTION public.trg_ensure_travel_file();

-- ---------- numero do file para a mensagem publica ----------
CREATE OR REPLACE FUNCTION public.booking_request_file_number(p_request_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT f.file_number_display
  FROM public.quote_booking_requests r
  JOIN public.travel_files f ON f.root_request_id = COALESCE(r.root_request_id, r.id)
  WHERE r.id = p_request_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.booking_request_file_number(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.booking_request_file_number(uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_request_file_number(uuid) TO service_role;

-- ---------- protecao de exclusao do orcamento ----------
CREATE OR REPLACE FUNCTION public.prevent_quote_delete_with_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_number text;
  v_has_request boolean;
BEGIN
  SELECT f.file_number_display INTO v_number
  FROM public.travel_files f WHERE f.quote_id = OLD.id LIMIT 1;

  SELECT EXISTS (
    SELECT 1 FROM public.quote_booking_requests r WHERE r.quote_id = OLD.id
  ) INTO v_has_request;

  IF v_number IS NOT NULL THEN
    RAISE EXCEPTION 'QUOTE_HAS_BOOKING_FILE:%', v_number
      USING ERRCODE = 'P0001';
  ELSIF v_has_request THEN
    RAISE EXCEPTION 'QUOTE_HAS_BOOKING_FILE:'
      USING ERRCODE = 'P0001';
  END IF;

  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS quotes_block_delete_with_booking ON public.quotes;
CREATE TRIGGER quotes_block_delete_with_booking
BEFORE DELETE ON public.quotes
FOR EACH ROW EXECUTE FUNCTION public.prevent_quote_delete_with_booking();

-- ---------- exclusao transacional de orcamento sem file ----------
CREATE OR REPLACE FUNCTION public.delete_quote_safely(p_quote_id uuid)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_quote RECORD;
BEGIN
  SELECT * INTO v_quote FROM public.quotes WHERE id = p_quote_id;
  IF v_quote.id IS NULL THEN RETURN; END IF;

  IF NOT public.is_agency_member(v_quote.user_id) THEN
    RAISE EXCEPTION 'NOT_ALLOWED' USING ERRCODE = 'P0001';
  END IF;

  -- o trigger BEFORE DELETE bloqueia antes de qualquer exclusao parcial
  DELETE FROM public.quote_services WHERE quote_id = p_quote_id;
  DELETE FROM public.quotes WHERE id = p_quote_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_quote_safely(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_quote_safely(uuid) TO authenticated, service_role;

-- ---------- backfill idempotente das solicitacoes existentes ----------
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN
    SELECT id FROM public.quote_booking_requests
    ORDER BY created_at ASC, id ASC
  LOOP
    PERFORM public.ensure_travel_file(r.id);
  END LOOP;
END $$;