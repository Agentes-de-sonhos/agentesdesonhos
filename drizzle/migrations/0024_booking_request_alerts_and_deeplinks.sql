-- Rodada 2: avisos em tempo real e deep link da ficha para pedidos de reserva
-- vindos do orçamento público. Aditivo: nada existente é alterado ou removido.

-- 1) Realtime das solicitações de reserva (filtro estrito por agency_id no cliente,
--    reforçado pela RLS já existente da tabela).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'quote_booking_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.quote_booking_requests;
  END IF;
END $$;

-- 2) Fila de e-mails com o deep link da ficha (travel_file) e o WhatsApp da
--    agência. A versão anterior continua existindo e funcionando.
CREATE OR REPLACE FUNCTION public.pending_booking_request_deliveries_v2(p_request_id uuid)
RETURNS TABLE(
  delivery_id uuid, channel text, recipient_kind text, recipient_email text,
  protocol text, version integer, status text, client_name text, client_email text,
  client_whatsapp text, client_notes text, currency text, total_estimated numeric,
  quote_id uuid, destination text, trip_title text, agency_name text,
  agency_user_id uuid, opportunity_id uuid, service_names text,
  travel_file_id uuid, travel_file_number text, agency_whatsapp text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  WITH claimed AS (
    UPDATE public.quote_booking_request_deliveries d
    SET attempts = d.attempts + 1, updated_at = now()
    WHERE d.request_id = p_request_id
      AND d.status = 'pending'
      AND d.channel = 'email'
    RETURNING d.id, d.channel, d.recipient_kind, d.recipient_email, d.request_id
  )
  SELECT c.id, c.channel, c.recipient_kind, c.recipient_email,
         r.protocol, r.version, r.status, r.client_name, r.client_email, r.client_whatsapp,
         r.client_notes, r.currency, r.total_estimated, r.quote_id,
         q.destination, q.trip_title,
         COALESCE(owner_p.agency_name, author_p.agency_name),
         CASE c.recipient_kind
           WHEN 'agency' THEN r.agency_id
           WHEN 'consultant' THEN r.user_id
           ELSE NULL::uuid
         END,
         r.opportunity_id,
         (SELECT string_agg(i.service_name, ', ' ORDER BY i.service_name)
            FROM public.quote_booking_request_items i WHERE i.request_id = r.id),
         tf.id,
         tf.file_number_display,
         public.to_e164_br(COALESCE(owner_p.phone, author_p.phone))
  FROM claimed c
  JOIN public.quote_booking_requests r ON r.id = c.request_id
  JOIN public.quotes q ON q.id = r.quote_id
  LEFT JOIN public.profiles owner_p ON owner_p.user_id = r.agency_id
  LEFT JOIN public.profiles author_p ON author_p.user_id = r.user_id
  LEFT JOIN LATERAL (
    SELECT f.id, f.file_number_display
    FROM public.travel_files f
    WHERE f.current_request_id = r.id OR f.root_request_id = r.id
    ORDER BY (f.current_request_id = r.id) DESC, f.created_at DESC
    LIMIT 1
  ) tf ON true;
$function$;

REVOKE ALL ON FUNCTION public.pending_booking_request_deliveries_v2(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pending_booking_request_deliveries_v2(uuid) TO service_role;

-- 3) Ficha (travel_file) de um pedido, para o deep link do aviso interno.
--    Respeita o isolamento: só devolve quando o usuário pertence à agência dona.
CREATE OR REPLACE FUNCTION public.booking_request_file_link(p_request_id uuid)
RETURNS TABLE(travel_file_id uuid, travel_file_number text, opportunity_id uuid)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT tf.id, tf.file_number_display, r.opportunity_id
  FROM public.quote_booking_requests r
  LEFT JOIN LATERAL (
    SELECT f.id, f.file_number_display
    FROM public.travel_files f
    WHERE f.current_request_id = r.id OR f.root_request_id = r.id
    ORDER BY (f.current_request_id = r.id) DESC, f.created_at DESC
    LIMIT 1
  ) tf ON true
  WHERE r.id = p_request_id
    AND (
      r.agency_id = auth.uid()
      OR r.user_id = auth.uid()
      OR r.agency_id = public.resolve_agency_id_for_user(auth.uid())
      OR public.has_role(auth.uid(), 'admin'::app_role)
    );
$function$;

REVOKE ALL ON FUNCTION public.booking_request_file_link(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_request_file_link(uuid) TO authenticated, service_role;

COMMENT ON FUNCTION public.pending_booking_request_deliveries_v2(uuid) IS
  'Fila de e-mails do pedido de reserva com deep link da ficha e WhatsApp da agência.';
COMMENT ON FUNCTION public.booking_request_file_link(uuid) IS
  'Resolve a ficha (travel_file) de um pedido de reserva para deep links internos.';
