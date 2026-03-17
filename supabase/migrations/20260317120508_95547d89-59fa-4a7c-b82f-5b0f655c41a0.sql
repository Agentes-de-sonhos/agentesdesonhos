
-- Add curation columns to noticias_dashboard
ALTER TABLE public.noticias_dashboard
  ADD COLUMN is_noticia_do_dia boolean NOT NULL DEFAULT false,
  ADD COLUMN top5_position integer DEFAULT NULL;

-- Constraint: top5_position must be 1-5 or null
ALTER TABLE public.noticias_dashboard
  ADD CONSTRAINT top5_position_range CHECK (top5_position IS NULL OR (top5_position >= 1 AND top5_position <= 5));

-- Unique constraint: only one noticia_do_dia at a time
CREATE UNIQUE INDEX idx_noticia_do_dia_unique ON public.noticias_dashboard (is_noticia_do_dia) WHERE is_noticia_do_dia = true;

-- Unique constraint: each top5 position used only once
CREATE UNIQUE INDEX idx_top5_position_unique ON public.noticias_dashboard (top5_position) WHERE top5_position IS NOT NULL;

-- Function to clear previous noticia_do_dia when setting a new one
CREATE OR REPLACE FUNCTION public.clear_previous_noticia_do_dia()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF NEW.is_noticia_do_dia = true THEN
    UPDATE public.noticias_dashboard
    SET is_noticia_do_dia = false
    WHERE is_noticia_do_dia = true AND id != NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_clear_noticia_do_dia
BEFORE INSERT OR UPDATE ON public.noticias_dashboard
FOR EACH ROW
WHEN (NEW.is_noticia_do_dia = true)
EXECUTE FUNCTION public.clear_previous_noticia_do_dia();
