
CREATE OR REPLACE FUNCTION public.ensure_pipeline_stage_legacy_key()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.legacy_key IS NULL OR length(NEW.legacy_key) = 0 THEN
    NEW.legacy_key := 'custom_' || replace(NEW.id::text, '-', '');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ensure_pipeline_stage_legacy_key ON public.pipeline_stages;
CREATE TRIGGER trg_ensure_pipeline_stage_legacy_key
  BEFORE INSERT ON public.pipeline_stages
  FOR EACH ROW EXECUTE FUNCTION public.ensure_pipeline_stage_legacy_key();
