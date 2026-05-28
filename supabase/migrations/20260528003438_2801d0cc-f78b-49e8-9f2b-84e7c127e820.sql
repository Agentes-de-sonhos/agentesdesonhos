
-- 1) Rename default first stage to "Nova oportunidade" for users who still use the default name
UPDATE public.pipeline_stages
SET name = 'Nova oportunidade'
WHERE legacy_key = 'new_contact'
  AND is_default = true
  AND name = 'Novo Contato';

-- 2) Update seed function so new users get the new label
CREATE OR REPLACE FUNCTION public.seed_default_pipeline_stages(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.pipeline_stages WHERE user_id = _user_id) THEN
    RETURN;
  END IF;

  INSERT INTO public.pipeline_stages (user_id, name, position, color, legacy_key, is_default) VALUES
    (_user_id, 'Nova oportunidade', 0, 'blue', 'new_contact', true),
    (_user_id, 'Em Atendimento', 1, 'amber', 'in_service', true),
    (_user_id, 'Orçamento em Criação', 2, 'orange', 'quote_creating', true),
    (_user_id, 'Orçamento Enviado', 3, 'violet', 'quote_sent', true),
    (_user_id, 'Negociação / Ajustes', 4, 'rose', 'negotiation', true),
    (_user_id, 'Follow-up', 5, 'sky', 'follow_up', true),
    (_user_id, 'Fechado', 6, 'emerald', 'closed', true),
    (_user_id, 'Perdido / Arquivado', 7, 'slate', 'lost', true);
END;
$$;

-- 3) Keep opportunities.stage (text) in sync with stage_id.legacy_key
--    so that AFTER triggers (auto_create_operation_on_close, handle_opportunity_closed)
--    fire correctly when the user moves a card on the Kanban (which writes stage_id only).
CREATE OR REPLACE FUNCTION public.sync_opportunity_stage_text()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  IF NEW.stage_id IS NOT NULL
     AND (TG_OP = 'INSERT' OR OLD.stage_id IS DISTINCT FROM NEW.stage_id)
  THEN
    SELECT legacy_key INTO v_key
    FROM public.pipeline_stages
    WHERE id = NEW.stage_id;
    IF v_key IS NOT NULL THEN
      NEW.stage := v_key;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_opportunity_stage_text ON public.opportunities;
CREATE TRIGGER trg_sync_opportunity_stage_text
BEFORE INSERT OR UPDATE OF stage_id ON public.opportunities
FOR EACH ROW EXECUTE FUNCTION public.sync_opportunity_stage_text();
