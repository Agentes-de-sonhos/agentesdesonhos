-- ============ 1) quote_booking_requests ============
CREATE TABLE public.quote_booking_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  root_request_id uuid NULL REFERENCES public.quote_booking_requests(id) ON DELETE SET NULL,
  version integer NOT NULL DEFAULT 1,
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  agency_id uuid NOT NULL,
  client_id uuid NULL REFERENCES public.clients(id) ON DELETE SET NULL,
  opportunity_id uuid NULL REFERENCES public.opportunities(id) ON DELETE SET NULL,
  protocol text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'received',
  client_name text NOT NULL,
  client_email text NOT NULL,
  client_whatsapp text NOT NULL,
  client_notes text NULL,
  disclaimer_accepted_at timestamptz NOT NULL DEFAULT now(),
  disclaimer_text_snapshot text NOT NULL,
  currency text NOT NULL DEFAULT 'BRL',
  total_estimated numeric NOT NULL DEFAULT 0,
  revised_total numeric NULL,
  client_final_accepted_at timestamptz NULL,
  expires_at timestamptz NULL,
  idempotency_key text NOT NULL UNIQUE,
  public_access_token uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  source_ip_hash text NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quote_booking_requests_version_check CHECK (version >= 1),
  CONSTRAINT quote_booking_requests_status_check CHECK (status IN (
    'received','under_review','awaiting_reconfirmation','approved','partially_approved',
    'unavailable','awaiting_client_acceptance','accepted','converted','cancelled','expired','superseded'
  )),
  CONSTRAINT quote_booking_requests_client_name_check CHECK (length(btrim(client_name)) > 0),
  CONSTRAINT quote_booking_requests_client_email_check CHECK (length(btrim(client_email)) > 0),
  CONSTRAINT quote_booking_requests_client_whatsapp_check CHECK (length(btrim(client_whatsapp)) > 0),
  CONSTRAINT quote_booking_requests_total_check CHECK (total_estimated >= 0)
);

GRANT SELECT ON public.quote_booking_requests TO authenticated;
GRANT ALL ON public.quote_booking_requests TO service_role;
ALTER TABLE public.quote_booking_requests ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX quote_booking_requests_root_version_uidx
  ON public.quote_booking_requests (root_request_id, version)
  WHERE root_request_id IS NOT NULL;
CREATE INDEX quote_booking_requests_quote_idx ON public.quote_booking_requests (quote_id);
CREATE INDEX quote_booking_requests_agency_status_idx ON public.quote_booking_requests (agency_id, status);
CREATE INDEX quote_booking_requests_opportunity_idx ON public.quote_booking_requests (opportunity_id);
CREATE INDEX quote_booking_requests_email_idx ON public.quote_booking_requests (quote_id, lower(btrim(client_email)));

-- ============ 2) quote_booking_request_items ============
CREATE TABLE public.quote_booking_request_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.quote_booking_requests(id) ON DELETE CASCADE,
  source_quote_service_id uuid NULL REFERENCES public.quote_services(id) ON DELETE SET NULL,
  service_type text NOT NULL,
  service_name text NOT NULL,
  snapshot jsonb NOT NULL,
  amount_snapshot numeric NOT NULL DEFAULT 0,
  selection_mode_snapshot text NOT NULL DEFAULT 'optional',
  choice_group_snapshot jsonb NULL,
  quantity integer NOT NULL DEFAULT 1,
  review_status text NOT NULL DEFAULT 'pending',
  revised_amount numeric NULL,
  replacement_snapshot jsonb NULL,
  agency_note text NULL,
  client_accepted boolean NULL,
  operation_service_id uuid NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qbri_quantity_check CHECK (quantity >= 1),
  CONSTRAINT qbri_amount_check CHECK (amount_snapshot >= 0),
  CONSTRAINT qbri_review_status_check CHECK (review_status IN (
    'pending','available','unavailable','repriced','replaced','approved','rejected'
  )),
  CONSTRAINT qbri_selection_mode_check CHECK (selection_mode_snapshot IN ('optional','required','alternative','free'))
);

GRANT SELECT ON public.quote_booking_request_items TO authenticated;
GRANT ALL ON public.quote_booking_request_items TO service_role;
ALTER TABLE public.quote_booking_request_items ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX qbri_request_source_uidx
  ON public.quote_booking_request_items (request_id, source_quote_service_id)
  WHERE source_quote_service_id IS NOT NULL;
CREATE INDEX qbri_request_idx ON public.quote_booking_request_items (request_id);

-- ============ 3) quote_booking_request_events ============
CREATE TABLE public.quote_booking_request_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.quote_booking_requests(id) ON DELETE CASCADE,
  item_id uuid NULL REFERENCES public.quote_booking_request_items(id) ON DELETE SET NULL,
  actor_type text NOT NULL,
  actor_user_id uuid NULL,
  actor_team_member_id uuid NULL,
  event_type text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT qbre_actor_type_check CHECK (actor_type IN ('client','agency','system')),
  CONSTRAINT qbre_event_type_check CHECK (length(btrim(event_type)) > 0)
);

GRANT SELECT ON public.quote_booking_request_events TO authenticated;
GRANT ALL ON public.quote_booking_request_events TO service_role;
ALTER TABLE public.quote_booking_request_events ENABLE ROW LEVEL SECURITY;
CREATE INDEX qbre_request_idx ON public.quote_booking_request_events (request_id, created_at DESC);

-- ============ triggers ============
CREATE TRIGGER update_quote_booking_requests_updated_at
BEFORE UPDATE ON public.quote_booking_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_booking_request_items_updated_at
BEFORE UPDATE ON public.quote_booking_request_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- snapshots imutáveis
CREATE OR REPLACE FUNCTION public.enforce_booking_item_snapshot_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.request_id IS DISTINCT FROM OLD.request_id
     OR NEW.source_quote_service_id IS DISTINCT FROM OLD.source_quote_service_id
     OR NEW.service_type IS DISTINCT FROM OLD.service_type
     OR NEW.service_name IS DISTINCT FROM OLD.service_name
     OR NEW.snapshot IS DISTINCT FROM OLD.snapshot
     OR NEW.amount_snapshot IS DISTINCT FROM OLD.amount_snapshot
     OR NEW.selection_mode_snapshot IS DISTINCT FROM OLD.selection_mode_snapshot
     OR NEW.choice_group_snapshot IS DISTINCT FROM OLD.choice_group_snapshot
     OR NEW.quantity IS DISTINCT FROM OLD.quantity
  THEN
    RAISE EXCEPTION 'Os dados registrados no momento do pedido não podem ser alterados';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_booking_item_snapshot_immutable
BEFORE UPDATE ON public.quote_booking_request_items
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_item_snapshot_immutable();

-- eventos append-only (defesa extra além da RLS)
CREATE OR REPLACE FUNCTION public.enforce_booking_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'O histórico do pedido é somente de inclusão';
END;
$$;

CREATE TRIGGER trg_booking_events_append_only
BEFORE UPDATE OR DELETE ON public.quote_booking_request_events
FOR EACH ROW EXECUTE FUNCTION public.enforce_booking_events_append_only();

-- ============ RLS ============
-- pedidos: leitura do titular, equipe da MESMA agência com quotes.view, e admin
CREATE POLICY "owner_can_view_booking_requests"
ON public.quote_booking_requests FOR SELECT TO authenticated
USING (user_id = auth.uid() OR agency_id = auth.uid());

CREATE POLICY "team_can_view_booking_requests"
ON public.quote_booking_requests FOR SELECT TO authenticated
USING (
  public.can_team('quotes.view')
  AND agency_id = public.resolve_agency_id_for_user(auth.uid())
);

CREATE POLICY "admins_can_view_booking_requests"
ON public.quote_booking_requests FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- itens
CREATE POLICY "owner_can_view_booking_request_items"
ON public.quote_booking_request_items FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_booking_requests r
  WHERE r.id = quote_booking_request_items.request_id
    AND (r.user_id = auth.uid() OR r.agency_id = auth.uid())
));

CREATE POLICY "team_can_view_booking_request_items"
ON public.quote_booking_request_items FOR SELECT TO authenticated
USING (
  public.can_team('quotes.view')
  AND EXISTS (
    SELECT 1 FROM public.quote_booking_requests r
    WHERE r.id = quote_booking_request_items.request_id
      AND r.agency_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "admins_can_view_booking_request_items"
ON public.quote_booking_request_items FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- itens: UPDATE apenas dos campos de análise (snapshots protegidos por trigger)
CREATE POLICY "owner_can_review_booking_request_items"
ON public.quote_booking_request_items FOR UPDATE TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_booking_requests r
  WHERE r.id = quote_booking_request_items.request_id
    AND (r.user_id = auth.uid() OR r.agency_id = auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM public.quote_booking_requests r
  WHERE r.id = quote_booking_request_items.request_id
    AND (r.user_id = auth.uid() OR r.agency_id = auth.uid())
));

CREATE POLICY "team_can_review_booking_request_items"
ON public.quote_booking_request_items FOR UPDATE TO authenticated
USING (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quote_booking_requests r
    WHERE r.id = quote_booking_request_items.request_id
      AND r.agency_id = public.resolve_agency_id_for_user(auth.uid())
  )
)
WITH CHECK (
  public.can_team('quotes.edit')
  AND EXISTS (
    SELECT 1 FROM public.quote_booking_requests r
    WHERE r.id = quote_booking_request_items.request_id
      AND r.agency_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

-- eventos: somente leitura (nenhuma policy de escrita: só service_role/RPC)
CREATE POLICY "owner_can_view_booking_request_events"
ON public.quote_booking_request_events FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.quote_booking_requests r
  WHERE r.id = quote_booking_request_events.request_id
    AND (r.user_id = auth.uid() OR r.agency_id = auth.uid())
));

CREATE POLICY "team_can_view_booking_request_events"
ON public.quote_booking_request_events FOR SELECT TO authenticated
USING (
  public.can_team('quotes.view')
  AND EXISTS (
    SELECT 1 FROM public.quote_booking_requests r
    WHERE r.id = quote_booking_request_events.request_id
      AND r.agency_id = public.resolve_agency_id_for_user(auth.uid())
  )
);

CREATE POLICY "admins_can_view_booking_request_events"
ON public.quote_booking_request_events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- ============ protocolo ============
CREATE OR REPLACE FUNCTION public.generate_booking_request_protocol()
RETURNS text
LANGUAGE plpgsql
VOLATILE
SET search_path TO 'public'
AS $$
DECLARE
  v_protocol text;
  v_tries int := 0;
BEGIN
  LOOP
    v_protocol := 'PR-' || to_char(now(), 'YYYYMMDD') || '-' ||
      upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.quote_booking_requests WHERE protocol = v_protocol
    );
    v_tries := v_tries + 1;
    IF v_tries > 10 THEN
      RAISE EXCEPTION 'Não foi possível gerar o protocolo do pedido';
    END IF;
  END LOOP;
  RETURN v_protocol;
END;
$$;
