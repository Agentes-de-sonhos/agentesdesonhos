CREATE TABLE public.full_package_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  quote_id UUID,
  expected_types TEXT[] NOT NULL DEFAULT '{}',
  source_kind TEXT NOT NULL CHECK (source_kind IN ('pdf','image','text')),
  source_url TEXT,
  source_text TEXT,
  ai_blocks JSONB NOT NULL DEFAULT '[]'::jsonb,
  trip_meta JSONB NOT NULL DEFAULT '{}'::jsonb,
  warnings JSONB NOT NULL DEFAULT '[]'::jsonb,
  review_status JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.full_package_imports TO authenticated;
GRANT ALL ON public.full_package_imports TO service_role;

ALTER TABLE public.full_package_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own package imports"
ON public.full_package_imports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own package imports"
ON public.full_package_imports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own package imports"
ON public.full_package_imports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users delete own package imports"
ON public.full_package_imports FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_full_package_imports_user ON public.full_package_imports(user_id, created_at DESC);
CREATE INDEX idx_full_package_imports_quote ON public.full_package_imports(quote_id) WHERE quote_id IS NOT NULL;

CREATE TRIGGER update_full_package_imports_updated_at
BEFORE UPDATE ON public.full_package_imports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();