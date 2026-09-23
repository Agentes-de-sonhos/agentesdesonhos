-- ============================================================================
-- 0025 - Materializacao dos servicos da solicitacao no processo (fluxo V2)
--
-- CAUSA RAIZ
-- `quote_booking_requests_ensure_file` e um trigger AFTER INSERT *por linha* na
-- tabela `quote_booking_requests`. A funcao `submit_quote_booking_request`
-- insere primeiro a solicitacao e SO DEPOIS os itens
-- (`quote_booking_request_items`). Logo, quando `ensure_travel_file` roda, a
-- solicitacao ainda nao tem itens: o INSERT ... SELECT em
-- `travel_file_services` copia ZERO linhas e o `requested_amount` cai no
-- fallback `total_estimated`. Resultado: processo com valor correto e nenhum
-- servico para reconfirmar, e nada mais chama `ensure_travel_file` depois.
--
-- CORRECAO (aditiva, sem alterar 0013-0024)
-- Trigger AFTER INSERT *por comando* em `quote_booking_request_items`, que
-- reexecuta `ensure_travel_file` para cada solicitacao afetada, agora com os
-- itens visiveis na mesma transacao. `ensure_travel_file` e idempotente
-- (ON CONFLICT (request_item_id) DO NOTHING) e recalcula `requested_amount`
-- a partir dos itens, portanto retries/replays/revisoes nao duplicam nada.
--
-- Nada aqui marca servico como disponivel: o status inicial canonico
-- `requested` e mantido, preservando a etapa de reconfirmacao da agencia.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.trg_materialize_request_item_services()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_request_id uuid;
BEGIN
  FOR v_request_id IN SELECT DISTINCT request_id FROM new_items WHERE request_id IS NOT NULL LOOP
    BEGIN
      PERFORM public.ensure_travel_file(v_request_id);
    EXCEPTION WHEN OTHERS THEN
      -- A gravacao da solicitacao do cliente nunca depende disto.
      INSERT INTO public.booking_request_issues (request_id, agency_id, source, error_message, payload)
      SELECT r.id, r.agency_id, 'materialize_request_items', SQLERRM,
             jsonb_build_object('sqlstate', SQLSTATE)
      FROM public.quote_booking_requests r
      WHERE r.id = v_request_id;
    END;
  END LOOP;
  RETURN NULL;
END;
$function$;

DROP TRIGGER IF EXISTS quote_booking_request_items_materialize ON public.quote_booking_request_items;

CREATE TRIGGER quote_booking_request_items_materialize
AFTER INSERT ON public.quote_booking_request_items
REFERENCING NEW TABLE AS new_items
FOR EACH STATEMENT
EXECUTE FUNCTION public.trg_materialize_request_item_services();

-- ----------------------------------------------------------------------------
-- Reparo controlado e idempotente de um processo especifico.
-- Nao confirma venda, nao cria operacao e nao cria venda: apenas materializa
-- os itens ja solicitados e reconcilia o valor solicitado do processo.
-- Restrita ao service_role (uso operacional/auditado).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.travel_file_backfill_services(p_file_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_file RECORD;
  v_before integer := 0;
  v_after integer := 0;
  v_req uuid;
BEGIN
  SELECT * INTO v_file FROM public.travel_files WHERE id = p_file_id FOR UPDATE;
  IF v_file.id IS NULL THEN
    RETURN jsonb_build_object('error', 'file_not_found');
  END IF;
  IF v_file.operation_id IS NOT NULL THEN
    -- Processo ja convertido: nao mexer em linhagem de venda/operacao.
    RETURN jsonb_build_object('error', 'file_already_converted');
  END IF;

  SELECT count(*) INTO v_before FROM public.travel_file_services WHERE file_id = p_file_id;

  FOR v_req IN
    SELECT r.id FROM public.quote_booking_requests r
    WHERE r.id = v_file.current_request_id
       OR r.root_request_id = v_file.root_request_id
    ORDER BY r.version ASC
  LOOP
    PERFORM public.ensure_travel_file(v_req);
  END LOOP;

  SELECT count(*) INTO v_after FROM public.travel_file_services WHERE file_id = p_file_id;
  SELECT * INTO v_file FROM public.travel_files WHERE id = p_file_id;

  IF v_after <> v_before AND v_file.current_request_id IS NOT NULL THEN
    INSERT INTO public.quote_booking_request_events (request_id, actor_type, event_type, payload)
    VALUES (
      v_file.current_request_id, 'system', 'file_services_backfilled',
      jsonb_build_object(
        'file_id', p_file_id,
        'services_before', v_before,
        'services_after', v_after,
        'requested_amount', v_file.requested_amount,
        'migration', '0025'
      )
    );
  END IF;

  RETURN jsonb_build_object(
    'file_id', p_file_id,
    'services_before', v_before,
    'services_after', v_after,
    'requested_amount', v_file.requested_amount,
    'operation_id', v_file.operation_id
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.travel_file_backfill_services(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.travel_file_backfill_services(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.travel_file_backfill_services(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.travel_file_backfill_services(uuid) TO service_role;