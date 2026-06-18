
-- 1. Table
CREATE TABLE IF NOT EXISTS public.commercial_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  title text,
  phone text,
  whatsapp text,
  email text,
  photo_url text,
  custom_message text,
  display_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_signatures_user ON public.commercial_signatures(user_id);

-- 2. Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.commercial_signatures TO authenticated;
GRANT SELECT ON public.commercial_signatures TO anon;
GRANT ALL ON public.commercial_signatures TO service_role;

-- 3. RLS
ALTER TABLE public.commercial_signatures ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner full access" ON public.commercial_signatures
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public can read active signatures" ON public.commercial_signatures
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

-- 4. updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_signatures_updated_at ON public.commercial_signatures;
CREATE TRIGGER trg_commercial_signatures_updated_at
  BEFORE UPDATE ON public.commercial_signatures
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Ensure single default per user
CREATE OR REPLACE FUNCTION public.ensure_single_default_signature()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.commercial_signatures
       SET is_default = false
     WHERE user_id = NEW.user_id
       AND id <> NEW.id
       AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_signatures_single_default ON public.commercial_signatures;
CREATE TRIGGER trg_commercial_signatures_single_default
  AFTER INSERT OR UPDATE OF is_default ON public.commercial_signatures
  FOR EACH ROW WHEN (NEW.is_default = true)
  EXECUTE FUNCTION public.ensure_single_default_signature();

-- 6. Snapshot columns on documents
ALTER TABLE public.quotes      ADD COLUMN IF NOT EXISTS signature_snapshot jsonb;
ALTER TABLE public.trips       ADD COLUMN IF NOT EXISTS signature_snapshot jsonb;
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS signature_snapshot jsonb;
