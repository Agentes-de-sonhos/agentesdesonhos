-- Fase 2 (correções): recusa reaproveitável, conexão nova começa seguindo e UPDATE endurecido

-- 1. Protege os participantes e as transições de status da conexão
CREATE OR REPLACE FUNCTION public.enforce_connection_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  actor uuid := auth.uid();
BEGIN
  IF NEW.requester_id <> OLD.requester_id OR NEW.receiver_id <> OLD.receiver_id THEN
    RAISE EXCEPTION 'Os participantes da conexão não podem ser alterados';
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status AND actor IS NOT NULL THEN
    IF OLD.status <> 'pending' THEN
      RAISE EXCEPTION 'Somente solicitações pendentes podem ser respondidas';
    END IF;
    IF NEW.status NOT IN ('accepted', 'rejected') THEN
      RAISE EXCEPTION 'Transição de status inválida';
    END IF;
    IF actor <> OLD.receiver_id THEN
      RAISE EXCEPTION 'Somente o destinatário pode responder à solicitação';
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_connection_update ON public.connections;
CREATE TRIGGER trg_enforce_connection_update
  BEFORE UPDATE ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.enforce_connection_update();

-- 2. Conexão aceita começa com ambos seguindo: limpa apenas o par envolvido
CREATE OR REPLACE FUNCTION public.reset_follow_on_connection_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'accepted'
     AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'accepted') THEN
    DELETE FROM public.community_muted_authors
    WHERE (user_id = NEW.requester_id AND author_id = NEW.receiver_id)
       OR (user_id = NEW.receiver_id AND author_id = NEW.requester_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reset_follow_on_connection_accepted ON public.connections;
CREATE TRIGGER trg_reset_follow_on_connection_accepted
  AFTER INSERT OR UPDATE OF status ON public.connections
  FOR EACH ROW EXECUTE FUNCTION public.reset_follow_on_connection_accepted();
