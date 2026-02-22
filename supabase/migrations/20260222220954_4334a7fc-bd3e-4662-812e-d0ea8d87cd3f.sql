
-- Add alert columns to noticias_dashboard
ALTER TABLE public.noticias_dashboard
  ADD COLUMN IF NOT EXISTS alerta_trade boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS nivel_alerta text NOT NULL DEFAULT 'nenhum';

-- Update RLS to allow reading sugerido_ia status
DROP POLICY IF EXISTS "Anyone can read approved noticias_dashboard" ON public.noticias_dashboard;
CREATE POLICY "Anyone can read approved or suggested noticias_dashboard"
  ON public.noticias_dashboard
  FOR SELECT
  USING (status IN ('aprovado', 'sugerido_ia'));

-- Set alerta_trade for existing high-score news
UPDATE public.noticias_dashboard
  SET alerta_trade = true, nivel_alerta = 'alto'
  WHERE relevancia_score >= 9;

UPDATE public.noticias_dashboard
  SET nivel_alerta = 'medio'
  WHERE relevancia_score >= 7 AND relevancia_score < 9 AND nivel_alerta = 'nenhum';
