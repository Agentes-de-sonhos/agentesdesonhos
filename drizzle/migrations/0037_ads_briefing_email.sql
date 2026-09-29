CREATE TABLE public.ads_briefing_integration (
  id text PRIMARY KEY,
  token_sha256 text NOT NULL CHECK (token_sha256 ~ '^[0-9a-f]{64}$'),
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.ads_briefing_integration FROM anon, authenticated, public;
GRANT ALL ON public.ads_briefing_integration TO service_role;
ALTER TABLE public.ads_briefing_integration ENABLE ROW LEVEL SECURITY;
INSERT INTO public.ads_briefing_integration (id, token_sha256, enabled)
VALUES ('sites-briefing', 'fb3f6e8d62818bc1ff37258ea72da7c10eda8f388ba7e51e3388f3955a5deb21', true)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.ads_briefing_email_deliveries (
  job_id text PRIMARY KEY CHECK (job_id ~ '^(briefing-[0-9]+-v1|ads-email-test-v1)$'),
  payload jsonb NOT NULL,
  job_json_text text NOT NULL,
  job_sha256 text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0,
  lease_until timestamptz,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  provider_message_id text,
  safe_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz
);
REVOKE ALL ON public.ads_briefing_email_deliveries FROM anon, authenticated, public;
GRANT ALL ON public.ads_briefing_email_deliveries TO service_role;
ALTER TABLE public.ads_briefing_email_deliveries ENABLE ROW LEVEL SECURITY;
CREATE INDEX ads_briefing_deliveries_due_idx ON public.ads_briefing_email_deliveries (next_attempt_at) WHERE status IN ('pending','sending');

CREATE TABLE public.ads_production_runs (
  job_id text PRIMARY KEY REFERENCES public.ads_briefing_email_deliveries(job_id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','blocked','review_ready')),
  stages jsonb NOT NULL DEFAULT '{"contract":{"status":"pending"},"site":{"status":"pending"},"extension":{"status":"pending"}}'::jsonb,
  lease_token uuid,
  lease_until timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON public.ads_production_runs FROM anon, authenticated, public;
GRANT ALL ON public.ads_production_runs TO service_role;
ALTER TABLE public.ads_production_runs ENABLE ROW LEVEL SECURITY;

-- Idempotent atomic enqueue (delivery + production run). Never overwrites a snapshot.
CREATE OR REPLACE FUNCTION public.ads_enqueue_briefing(p_job_id text, p_payload jsonb, p_job_json_text text, p_job_sha256 text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_existing public.ads_briefing_email_deliveries%ROWTYPE;
BEGIN
  INSERT INTO public.ads_briefing_email_deliveries (job_id, payload, job_json_text, job_sha256)
  VALUES (p_job_id, p_payload, p_job_json_text, p_job_sha256)
  ON CONFLICT (job_id) DO NOTHING;
  IF FOUND THEN
    INSERT INTO public.ads_production_runs (job_id) VALUES (p_job_id);
    RETURN 'created';
  END IF;
  SELECT * INTO v_existing FROM public.ads_briefing_email_deliveries WHERE job_id = p_job_id;
  IF v_existing.job_json_text = p_job_json_text AND v_existing.payload = p_payload THEN
    RETURN 'exists';
  END IF;
  RETURN 'conflict';
END $$;

-- Claim one delivery (pending, or sending with expired lease) within 8 attempts / 20h window.
CREATE OR REPLACE FUNCTION public.ads_claim_briefing_delivery(p_job_id text)
RETURNS TABLE (job_id text, payload jsonb, job_json_text text, job_sha256 text, attempts integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ads_briefing_email_deliveries d
     SET status = 'failed', lease_until = NULL,
         safe_error = COALESCE(d.safe_error, 'Limite de tentativas ou janela de reenvio expirada.')
   WHERE d.job_id = p_job_id AND d.status IN ('pending','sending')
     AND (d.attempts >= 8 OR d.created_at < now() - interval '20 hours')
     AND (d.status = 'pending' OR d.lease_until < now());
  RETURN QUERY
  UPDATE public.ads_briefing_email_deliveries d
     SET status = 'sending', attempts = d.attempts + 1, lease_until = now() + interval '5 minutes'
   WHERE d.job_id = p_job_id
     AND ((d.status = 'pending' AND d.next_attempt_at <= now())
          OR (d.status = 'sending' AND d.lease_until < now()))
     AND d.attempts < 8 AND d.created_at >= now() - interval '20 hours'
  RETURNING d.job_id, d.payload, d.job_json_text, d.job_sha256, d.attempts;
END $$;

CREATE OR REPLACE FUNCTION public.ads_complete_briefing_delivery(p_job_id text, p_success boolean, p_provider_message_id text, p_error text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_status text;
BEGIN
  IF p_success THEN
    UPDATE public.ads_briefing_email_deliveries
       SET status = 'sent', provider_message_id = p_provider_message_id, sent_at = now(),
           lease_until = NULL, safe_error = NULL
     WHERE job_id = p_job_id AND status = 'sending'
    RETURNING status INTO v_status;
  ELSE
    UPDATE public.ads_briefing_email_deliveries d
       SET status = CASE WHEN d.attempts >= 8 OR d.created_at < now() - interval '20 hours' THEN 'failed' ELSE 'pending' END,
           safe_error = left(COALESCE(p_error, 'Falha no envio.'), 200),
           lease_until = NULL,
           next_attempt_at = now() + least(interval '2 hours', interval '1 minute' * power(2, d.attempts))
     WHERE d.job_id = p_job_id AND d.status = 'sending'
    RETURNING d.status INTO v_status;
  END IF;
  RETURN COALESCE(v_status, 'unchanged');
END $$;

CREATE OR REPLACE FUNCTION public.ads_due_briefing_deliveries(p_limit integer)
RETURNS TABLE (job_id text) LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  SELECT d.job_id FROM public.ads_briefing_email_deliveries d
   WHERE (d.status = 'pending' AND d.next_attempt_at <= now())
      OR (d.status = 'sending' AND d.lease_until < now())
   ORDER BY d.next_attempt_at
   LIMIT greatest(1, least(coalesce(p_limit, 5), 20));
$$;

-- Production automation (service-only). Stores only references, never documents.
CREATE OR REPLACE FUNCTION public.ads_claim_production_job(p_job_id text, p_lease_token uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.ads_production_runs%ROWTYPE;
BEGIN
  IF p_lease_token IS NULL THEN RAISE EXCEPTION 'lease_token obrigatório'; END IF;
  UPDATE public.ads_production_runs
     SET status = 'processing', lease_token = p_lease_token,
         lease_until = now() + interval '45 minutes', updated_at = now()
   WHERE job_id = p_job_id
     AND (status = 'pending' OR (status = 'processing' AND (lease_until IS NULL OR lease_until < now())))
  RETURNING * INTO r;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('claimed', false);
  END IF;
  RETURN jsonb_build_object('claimed', true, 'job_id', r.job_id, 'status', r.status, 'stages', r.stages, 'lease_until', r.lease_until);
END $$;

CREATE OR REPLACE FUNCTION public.ads_resume_production_job(p_job_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.ads_production_runs SET status = 'pending', lease_token = NULL, lease_until = NULL, updated_at = now()
   WHERE job_id = p_job_id AND status = 'blocked';
  RETURN FOUND;
END $$;

CREATE OR REPLACE FUNCTION public.ads_record_production_stage(p_job_id text, p_lease_token uuid, p_stage text, p_status text, p_result jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  r public.ads_production_runs%ROWTYPE;
  v_order text[] := ARRAY['contract','site','extension'];
  v_idx int;
  v_prev text;
  v_cur text;
  v_stages jsonb;
  v_run_status text;
BEGIN
  IF p_stage IS NULL OR NOT (p_stage = ANY (v_order)) THEN RAISE EXCEPTION 'etapa inválida'; END IF;
  IF p_status NOT IN ('processing','ready','blocked') THEN RAISE EXCEPTION 'status de etapa inválido'; END IF;
  IF p_result IS NOT NULL AND jsonb_typeof(p_result) <> 'object' THEN RAISE EXCEPTION 'resultado deve ser objeto'; END IF;
  IF p_result IS NOT NULL AND length(p_result::text) > 8192 THEN RAISE EXCEPTION 'resultado excede 8KB (guarde apenas referências)'; END IF;
  IF p_status = 'ready' AND (p_result IS NULL OR NOT (p_result ? 'refs')
       OR jsonb_typeof(p_result->'refs') NOT IN ('array','object')
       OR p_result->'refs' IN ('[]'::jsonb, '{}'::jsonb)) THEN
    RAISE EXCEPTION 'etapa pronta exige referências (refs)';
  END IF;

  SELECT * INTO r FROM public.ads_production_runs WHERE job_id = p_job_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'job inexistente'; END IF;
  IF r.status <> 'processing' OR r.lease_token IS DISTINCT FROM p_lease_token OR r.lease_until < now() THEN
    RAISE EXCEPTION 'lease inválido ou expirado';
  END IF;

  v_idx := array_position(v_order, p_stage);
  IF v_idx > 1 THEN
    v_prev := r.stages->v_order[v_idx-1]->>'status';
    IF v_prev IS DISTINCT FROM 'ready' THEN RAISE EXCEPTION 'etapa anterior não concluída'; END IF;
  END IF;
  v_cur := r.stages->p_stage->>'status';
  v_stages := r.stages;
  IF v_cur = 'ready' THEN
    IF p_status <> 'ready' THEN RAISE EXCEPTION 'etapa já concluída não pode regredir'; END IF;
    -- preserva a etapa pronta sem sobrescrever
  ELSE
    v_stages := jsonb_set(v_stages, ARRAY[p_stage],
      jsonb_build_object('status', p_status, 'result', COALESCE(p_result, '{}'::jsonb), 'updated_at', now()));
  END IF;

  IF p_status = 'blocked' THEN
    v_run_status := 'blocked';
  ELSIF (v_stages->'contract'->>'status') = 'ready' AND (v_stages->'site'->>'status') = 'ready'
        AND (v_stages->'extension'->>'status') = 'ready' THEN
    v_run_status := 'review_ready';
  ELSE
    v_run_status := 'processing';
  END IF;

  UPDATE public.ads_production_runs
     SET stages = v_stages, status = v_run_status, updated_at = now(),
         lease_token = CASE WHEN v_run_status = 'processing' THEN lease_token ELSE NULL END,
         lease_until = CASE WHEN v_run_status = 'processing' THEN now() + interval '45 minutes' ELSE NULL END
   WHERE job_id = p_job_id;
  RETURN jsonb_build_object('job_id', p_job_id, 'status', v_run_status, 'stages', v_stages);
END $$;

REVOKE ALL ON FUNCTION public.ads_enqueue_briefing(text, jsonb, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_claim_briefing_delivery(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_complete_briefing_delivery(text, boolean, text, text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_due_briefing_deliveries(integer) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_claim_production_job(text, uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_resume_production_job(text) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.ads_record_production_stage(text, uuid, text, text, jsonb) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.ads_enqueue_briefing(text, jsonb, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ads_claim_briefing_delivery(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ads_complete_briefing_delivery(text, boolean, text, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ads_due_briefing_deliveries(integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.ads_claim_production_job(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.ads_resume_production_job(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.ads_record_production_stage(text, uuid, text, text, jsonb) TO service_role;