-- Create table for additional entry values (RAV, taxes, fees) on consolidated quotes
CREATE TABLE public.quote_entry_extras (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('rav','tax','fee','fii','admin_fee','other')),
  description TEXT,
  calculation_mode TEXT NOT NULL DEFAULT 'fixed' CHECK (calculation_mode IN ('fixed','percent')),
  value NUMERIC(14,4) NOT NULL DEFAULT 0,
  visible_to_client BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_quote_entry_extras_quote_id ON public.quote_entry_extras(quote_id);

GRANT SELECT ON public.quote_entry_extras TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.quote_entry_extras TO authenticated;
GRANT ALL ON public.quote_entry_extras TO service_role;

ALTER TABLE public.quote_entry_extras ENABLE ROW LEVEL SECURITY;

-- Public read: mirror public access to quotes (anyone with the public link can read the quote)
CREATE POLICY "Public can view entry extras of accessible quotes"
  ON public.quote_entry_extras FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_entry_extras.quote_id
    )
  );

-- Authenticated owners: full management of extras tied to their own quotes
CREATE POLICY "Owners can insert entry extras"
  ON public.quote_entry_extras FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_entry_extras.quote_id
        AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update entry extras"
  ON public.quote_entry_extras FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_entry_extras.quote_id
        AND q.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_entry_extras.quote_id
        AND q.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can delete entry extras"
  ON public.quote_entry_extras FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.quotes q
      WHERE q.id = quote_entry_extras.quote_id
        AND q.user_id = auth.uid()
    )
  );

CREATE TRIGGER trg_quote_entry_extras_updated_at
  BEFORE UPDATE ON public.quote_entry_extras
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();