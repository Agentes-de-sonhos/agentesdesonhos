
CREATE TABLE public.showcase_auto_overrides (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  showcase_id UUID NOT NULL REFERENCES public.agency_showcases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  material_key TEXT NOT NULL,
  is_hidden BOOLEAN NOT NULL DEFAULT false,
  custom_order INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(showcase_id, material_key)
);

ALTER TABLE public.showcase_auto_overrides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own overrides"
ON public.showcase_auto_overrides FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own overrides"
ON public.showcase_auto_overrides FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own overrides"
ON public.showcase_auto_overrides FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own overrides"
ON public.showcase_auto_overrides FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_showcase_auto_overrides_updated_at
BEFORE UPDATE ON public.showcase_auto_overrides
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
