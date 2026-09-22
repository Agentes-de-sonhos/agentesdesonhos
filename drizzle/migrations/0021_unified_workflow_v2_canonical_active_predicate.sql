-- Fase 1A (correção final). Única mudança: handle_opportunity_closed passa a usar
-- o predicado canônico public.travel_file_is_active(tf.status) em vez de
-- tf.status <> 'cancelled'. Assim cancelled E trip_completed são terminais e
-- "0 processos ativos" volta ao caminho legado criando operação E venda.
-- O corpo e o comportamento sem entitlement permanecem idênticos.

CREATE OR REPLACE FUNCTION public.handle_opportunity_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  client_record RECORD;
BEGIN
  IF NEW.stage = 'closed' AND (OLD.stage IS NULL OR OLD.stage != 'closed') THEN
    -- Idempotência global: nunca cria segunda venda para a mesma oportunidade,
    -- e nunca cria venda quando o fluxo unificado é o dono da conversão.
    IF NOT EXISTS (SELECT 1 FROM public.sales WHERE opportunity_id = NEW.id)
       AND NOT (
         public.agency_has_entitlement(NEW.user_id, 'unified_workflow_v2')
         AND EXISTS (SELECT 1 FROM public.travel_files tf
                     WHERE tf.opportunity_id = NEW.id
                       AND public.travel_file_is_active(tf.status))
       ) THEN
      SELECT * INTO client_record FROM public.clients WHERE id = NEW.client_id;
      INSERT INTO public.sales (
        user_id, client_id, client_name, destination, sale_amount, opportunity_id,
        sale_date, conversion_key, flow_origin
      ) VALUES (
        NEW.user_id, NEW.client_id, COALESCE(client_record.name, 'Cliente'),
        NEW.destination, NEW.estimated_value, NEW.id, CURRENT_DATE,
        'opportunity:' || NEW.id::text, 'legacy_close'
      );
    END IF;

    UPDATE public.clients
    SET status = 'cliente_ativo', updated_at = now()
    WHERE id = NEW.client_id AND status IN ('lead', 'em_negociacao');
  END IF;

  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.handle_opportunity_closed() IS
  'Fechamento de oportunidade (legado). Usa o predicado canônico travel_file_is_active para decidir se o fluxo unificado é dono da conversão.';