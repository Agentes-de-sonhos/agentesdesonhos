-- Add plan and stripe metadata to card_activations
ALTER TABLE public.card_activations
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'profissional',
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_card_activations_email ON public.card_activations (email);
CREATE INDEX IF NOT EXISTS idx_card_activations_stripe_session ON public.card_activations (stripe_session_id);