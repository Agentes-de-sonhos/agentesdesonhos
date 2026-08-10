-- 1. Connection lifecycle + inert encryption preparation on google_calendar_tokens
ALTER TABLE public.google_calendar_tokens
  ADD COLUMN IF NOT EXISTS connection_state text NOT NULL DEFAULT 'connected',
  ADD COLUMN IF NOT EXISTS last_auth_error text,
  ADD COLUMN IF NOT EXISTS last_auth_error_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS access_token_enc text,
  ADD COLUMN IF NOT EXISTS refresh_token_enc text,
  ADD COLUMN IF NOT EXISTS token_enc_version integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.google_calendar_tokens'::regclass
      AND conname = 'google_calendar_tokens_connection_state_check'
  ) THEN
    ALTER TABLE public.google_calendar_tokens
      ADD CONSTRAINT google_calendar_tokens_connection_state_check
      CHECK (connection_state IN ('connected', 'reconnect_required', 'revoked'));
  END IF;
END $$;

-- 2. Tokens become service-role only. No client (anon/authenticated) reach.
DROP POLICY IF EXISTS "Users can manage own tokens" ON public.google_calendar_tokens;
ALTER TABLE public.google_calendar_tokens ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.google_calendar_tokens FROM anon;
REVOKE ALL ON public.google_calendar_tokens FROM authenticated;
GRANT ALL ON public.google_calendar_tokens TO service_role;

-- 3. OAuth state store: single-use, TTL-bound, never client readable.
CREATE TABLE IF NOT EXISTS public.google_oauth_states (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nonce_hash text NOT NULL,
  redirect_origin text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL,
  consumed_at timestamp with time zone
);

GRANT ALL ON public.google_oauth_states TO service_role;
ALTER TABLE public.google_oauth_states ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies: anon/authenticated have no grants and no policies.

CREATE INDEX IF NOT EXISTS google_oauth_states_expires_at_idx
  ON public.google_oauth_states (expires_at);
CREATE INDEX IF NOT EXISTS google_oauth_states_user_id_idx
  ON public.google_oauth_states (user_id);

-- 4. Atomic single-use consumption of an OAuth state.
CREATE OR REPLACE FUNCTION public.consume_google_oauth_state(p_id uuid, p_nonce_hash text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  UPDATE public.google_oauth_states
     SET consumed_at = now()
   WHERE id = p_id
     AND nonce_hash = p_nonce_hash
     AND consumed_at IS NULL
     AND expires_at > now()
  RETURNING user_id INTO v_user_id;

  RETURN v_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.consume_google_oauth_state(uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_google_oauth_state(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.consume_google_oauth_state(uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.consume_google_oauth_state(uuid, text) TO service_role;

-- 5. Housekeeping for expired/consumed states.
CREATE OR REPLACE FUNCTION public.cleanup_google_oauth_states()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted integer;
BEGIN
  DELETE FROM public.google_oauth_states
   WHERE expires_at < now() - interval '1 day'
      OR (consumed_at IS NOT NULL AND consumed_at < now() - interval '1 day');
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RETURN v_deleted;
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_google_oauth_states() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cleanup_google_oauth_states() FROM anon;
REVOKE ALL ON FUNCTION public.cleanup_google_oauth_states() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.cleanup_google_oauth_states() TO service_role;

-- 6. Cron shared secret is read from the vault, never inlined in cron SQL.
CREATE OR REPLACE FUNCTION public.get_calendar_cron_secret()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault
AS $$
DECLARE
  v_secret text;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'calendar_cron_secret'
   LIMIT 1;
  RETURN v_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.get_calendar_cron_secret() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_calendar_cron_secret() FROM anon;
REVOKE ALL ON FUNCTION public.get_calendar_cron_secret() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.get_calendar_cron_secret() TO service_role;

-- 7. Cron entry point: reads the secret at runtime and sends it as a header.
CREATE OR REPLACE FUNCTION public.trigger_google_calendar_cron()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, extensions
AS $$
DECLARE
  v_secret text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_secret
    FROM vault.decrypted_secrets
   WHERE name = 'calendar_cron_secret'
   LIMIT 1;

  IF v_secret IS NULL THEN
    RAISE NOTICE 'calendar_cron_secret missing in vault; cron trigger skipped';
    RETURN NULL;
  END IF;

  SELECT net.http_post(
    url := 'https://mlwwpckahhfsixplxwif.supabase.co/functions/v1/google-calendar-cron',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-cron-secret', v_secret
    ),
    body := jsonb_build_object('invoked_at', now())
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.trigger_google_calendar_cron() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trigger_google_calendar_cron() FROM anon;
REVOKE ALL ON FUNCTION public.trigger_google_calendar_cron() FROM authenticated;