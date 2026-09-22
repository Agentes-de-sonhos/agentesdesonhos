-- Fila de notificações das solicitações do site white label.
-- Aditiva: nenhuma tabela/coluna existente é alterada. Uma falha de envio
-- NUNCA afeta a solicitação nem o CRM, porque vive em linhas próprias.

CREATE TABLE IF NOT EXISTS public.agency_request_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.agency_site_requests(id) ON DELETE CASCADE,
  agency_user_id uuid NOT NULL,
  channel text NOT NULL CHECK (channel IN ('email_client', 'email_agency', 'whatsapp_agency')),
  recipient text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'sent', 'failed', 'skipped', 'awaiting_template')),
  attempts integer NOT NULL DEFAULT 0,
  last_error text,
  provider_message_id text,
  claimed_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (request_id, channel)
);

GRANT SELECT ON public.agency_request_notifications TO authenticated;
GRANT ALL ON public.agency_request_notifications TO service_role;

ALTER TABLE public.agency_request_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Agency owner reads own request notifications" ON public.agency_request_notifications;
CREATE POLICY "Agency owner reads own request notifications"
ON public.agency_request_notifications
FOR SELECT TO authenticated
USING (agency_user_id = auth.uid());

CREATE INDEX IF NOT EXISTS agency_request_notifications_pending_idx
  ON public.agency_request_notifications (status, created_at)
  WHERE status = 'pending';

-- E.164 brasileiro a partir de um telefone livre. NULL quando não dá para
-- normalizar com segurança: nunca inventamos DDI/DDD.
CREATE OR REPLACE FUNCTION public.to_e164_br(_phone text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE
  d text;
BEGIN
  d := regexp_replace(COALESCE(_phone, ''), '[^0-9]', '', 'g');
  IF d = '' THEN RETURN NULL; END IF;
  IF length(d) IN (10, 11) THEN RETURN '+55' || d; END IF;
  IF length(d) IN (12, 13) AND left(d, 2) = '55' THEN RETURN '+' || d; END IF;
  IF length(d) BETWEEN 11 AND 15 THEN RETURN '+' || d; END IF;
  RETURN NULL;
END;
$$;

-- Enfileira as notificações de UMA solicitação. Idempotente pela chave
-- (request_id, channel): replay/retry não gera segundo envio.
CREATE OR REPLACE FUNCTION public.enqueue_agency_request_notifications()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_agency_email text;
  v_agency_phone text;
BEGIN
  SELECT u.email INTO v_agency_email FROM auth.users u WHERE u.id = NEW.agency_user_id;
  SELECT public.to_e164_br(p.phone) INTO v_agency_phone
    FROM public.profiles p WHERE p.user_id = NEW.agency_user_id;

  INSERT INTO public.agency_request_notifications (request_id, agency_user_id, channel, recipient, status)
  VALUES
    (NEW.id, NEW.agency_user_id, 'email_client', NEW.lead_email,
     CASE WHEN NEW.lead_email IS NULL THEN 'skipped' ELSE 'pending' END),
    (NEW.id, NEW.agency_user_id, 'email_agency', v_agency_email,
     CASE WHEN v_agency_email IS NULL THEN 'skipped' ELSE 'pending' END),
    -- WhatsApp fica PREPARADO e inerte: só sai do estado de espera quando
    -- existir template aprovado e configuração válida.
    (NEW.id, NEW.agency_user_id, 'whatsapp_agency', v_agency_phone,
     CASE WHEN v_agency_phone IS NULL THEN 'skipped' ELSE 'awaiting_template' END)
  ON CONFLICT (request_id, channel) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enqueue_agency_request_notifications ON public.agency_site_requests;
CREATE TRIGGER trg_enqueue_agency_request_notifications
AFTER INSERT ON public.agency_site_requests
FOR EACH ROW EXECUTE FUNCTION public.enqueue_agency_request_notifications();

-- Worker: reserva um lote de envios pendentes. Só o service_role executa.
CREATE OR REPLACE FUNCTION public.claim_agency_request_notifications(p_limit integer DEFAULT 20)
RETURNS TABLE (
  notification_id uuid,
  channel text,
  recipient text,
  request_id uuid,
  protocol text,
  agency_name text,
  opportunity_id uuid,
  lead_name text,
  lead_phone text,
  lead_email text,
  service_label text,
  destination text,
  summary text,
  notes text,
  details jsonb,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  WITH claimed AS (
    UPDATE public.agency_request_notifications n
       SET attempts = n.attempts + 1,
           claimed_at = now()
     WHERE n.id IN (
       SELECT c.id
         FROM public.agency_request_notifications c
        WHERE c.status = 'pending'
          AND c.attempts < 5
          AND (c.claimed_at IS NULL OR c.claimed_at < now() - interval '5 minutes')
        ORDER BY c.created_at
        LIMIT GREATEST(1, LEAST(100, COALESCE(p_limit, 20)))
        FOR UPDATE SKIP LOCKED
     )
    RETURNING n.*
  )
  SELECT c.id,
         c.channel,
         c.recipient,
         r.id,
         upper(left(replace(r.id::text, '-', ''), 8)),
         COALESCE(NULLIF(btrim(p.agency_name), ''), 'sua agência'),
         r.opportunity_id,
         r.lead_name,
         r.lead_phone,
         r.lead_email,
         COALESCE(r.service_label, r.service_key),
         r.destination,
         r.summary,
         r.notes,
         r.details,
         r.created_at
    FROM claimed c
    JOIN public.agency_site_requests r ON r.id = c.request_id
    LEFT JOIN public.profiles p ON p.user_id = c.agency_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_agency_request_notifications(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.claim_agency_request_notifications(integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_agency_request_notifications(integer) TO service_role;

CREATE OR REPLACE FUNCTION public.complete_agency_request_notification(
  p_notification_id uuid,
  p_status text,
  p_provider_message_id text DEFAULT NULL,
  p_error text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_status NOT IN ('sent', 'failed', 'skipped', 'pending') THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_STATUS';
  END IF;
  UPDATE public.agency_request_notifications
     SET status = p_status,
         provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
         last_error = left(p_error, 500),
         sent_at = CASE WHEN p_status = 'sent' THEN now() ELSE sent_at END
   WHERE id = p_notification_id;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_agency_request_notification(uuid, text, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.complete_agency_request_notification(uuid, text, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.complete_agency_request_notification(uuid, text, text, text) TO service_role;

-- Tempo real do aviso interno: a agência só recebe as próprias linhas, porque
-- o Realtime respeita a política de SELECT já existente na tabela.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'agency_site_requests'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.agency_site_requests;
  END IF;
END $$;