
-- Table to store activation tokens generated after Stripe payment
CREATE TABLE public.card_activations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL,
  stripe_session_id TEXT NOT NULL UNIQUE,
  activation_token TEXT NOT NULL UNIQUE,
  payment_status TEXT NOT NULL DEFAULT 'paid',
  used BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Index for fast token lookups
CREATE INDEX idx_card_activations_token ON public.card_activations (activation_token);
CREATE INDEX idx_card_activations_email ON public.card_activations (email);

-- RLS
ALTER TABLE public.card_activations ENABLE ROW LEVEL SECURITY;

-- Only service role can insert/update (via edge functions)
-- No direct user access needed
CREATE POLICY "Service role full access" ON public.card_activations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
