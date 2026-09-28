-- Ativa o aviso por WhatsApp das solicitações do site (template Utility aprovado).
-- Novas solicitações entram na fila como 'pending'; linhas já existentes não são
-- alteradas, para nunca disparar avisos retroativos.
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
    (NEW.id, NEW.agency_user_id, 'whatsapp_agency', v_agency_phone,
     CASE WHEN v_agency_phone IS NULL THEN 'skipped' ELSE 'pending' END)
  ON CONFLICT (request_id, channel) DO NOTHING;

  RETURN NEW;
END;
$$;