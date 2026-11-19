-- Temporary password gate for the Pristur institutional site. The password
-- stays server-side; only random, hashed unlock tokens are stored.
CREATE TABLE IF NOT EXISTS public.pristur_site_unlock_tokens (
  token_hash text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS public.pristur_site_unlock_rate (
  singleton boolean PRIMARY KEY DEFAULT true CHECK (singleton),
  failures integer NOT NULL DEFAULT 0,
  window_started_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.pristur_site_unlock_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pristur_site_unlock_rate ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.pristur_site_unlock_tokens FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.pristur_site_unlock_rate FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.pristur_site_unlock(
  p_action text,
  p_password text DEFAULT NULL,
  p_token text DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  v_now timestamptz := clock_timestamp();
  v_window timestamptz;
  v_failures integer;
  v_token text;
  v_expires timestamptz;
BEGIN
  IF p_action = 'unlock' THEN
    IF p_password IS NULL OR length(p_password) = 0 OR length(p_password) > 200 THEN
      RETURN jsonb_build_object('ok', false);
    END IF;

    INSERT INTO public.pristur_site_unlock_rate (singleton, failures, window_started_at)
    VALUES (true, 0, v_now) ON CONFLICT (singleton) DO NOTHING;
    SELECT failures, window_started_at INTO v_failures, v_window
    FROM public.pristur_site_unlock_rate WHERE singleton = true FOR UPDATE;
    IF v_window <= v_now - interval '10 minutes' THEN
      v_failures := 0;
      UPDATE public.pristur_site_unlock_rate
      SET failures = 0, window_started_at = v_now WHERE singleton = true;
    END IF;
    IF v_failures >= 10 THEN RETURN jsonb_build_object('ok', false); END IF;

    IF encode(extensions.digest(convert_to(p_password, 'UTF8'), 'sha256'), 'hex')
       <> '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4' THEN
      UPDATE public.pristur_site_unlock_rate
      SET failures = failures + 1 WHERE singleton = true;
      RETURN jsonb_build_object('ok', false);
    END IF;

    UPDATE public.pristur_site_unlock_rate
    SET failures = 0, window_started_at = v_now WHERE singleton = true;
    v_token := encode(extensions.gen_random_bytes(32), 'hex');
    v_expires := v_now + interval '1 day';
    DELETE FROM public.pristur_site_unlock_tokens WHERE expires_at <= v_now;
    INSERT INTO public.pristur_site_unlock_tokens (token_hash, expires_at)
    VALUES (encode(extensions.digest(v_token, 'sha256'), 'hex'), v_expires);
    RETURN jsonb_build_object('ok', true, 'token', v_token,
      'exp', floor(extract(epoch FROM v_expires) * 1000)::bigint);
  END IF;

  IF p_action = 'verify' AND p_token ~ '^[0-9a-f]{64}$' THEN
    SELECT expires_at INTO v_expires FROM public.pristur_site_unlock_tokens
    WHERE token_hash = encode(extensions.digest(p_token, 'sha256'), 'hex')
      AND expires_at > v_now;
    IF v_expires IS NOT NULL THEN
      RETURN jsonb_build_object('ok', true, 'token', p_token,
        'exp', floor(extract(epoch FROM v_expires) * 1000)::bigint);
    END IF;
  END IF;
  RETURN jsonb_build_object('ok', false);
END;
$$;
REVOKE ALL ON FUNCTION public.pristur_site_unlock(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pristur_site_unlock(text, text, text) TO anon, authenticated;
