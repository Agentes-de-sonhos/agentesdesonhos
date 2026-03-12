-- Track signup attempts for card activation flow
CREATE TABLE IF NOT EXISTS public.activation_signup_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  window_started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  blocked_until TIMESTAMPTZ,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT activation_signup_attempts_email_ip_key UNIQUE (email, ip_address)
);

CREATE INDEX IF NOT EXISTS idx_activation_signup_attempts_email_ip
  ON public.activation_signup_attempts (email, ip_address);

ALTER TABLE public.activation_signup_attempts ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS update_activation_signup_attempts_updated_at
  ON public.activation_signup_attempts;

CREATE TRIGGER update_activation_signup_attempts_updated_at
BEFORE UPDATE ON public.activation_signup_attempts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();