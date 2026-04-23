-- Tabela de anotações da oportunidade (timeline)
CREATE TABLE IF NOT EXISTS public.opportunity_notes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_notes_opportunity_id 
  ON public.opportunity_notes(opportunity_id, created_at DESC);

ALTER TABLE public.opportunity_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own opportunity notes"
ON public.opportunity_notes FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opportunity notes"
ON public.opportunity_notes FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunity notes"
ON public.opportunity_notes FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunity notes"
ON public.opportunity_notes FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_opportunity_notes_updated_at
BEFORE UPDATE ON public.opportunity_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de etiquetas (labels) por agente
CREATE TABLE IF NOT EXISTS public.opportunity_labels (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text NOT NULL DEFAULT '#3b82f6',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_labels_user_id 
  ON public.opportunity_labels(user_id);

ALTER TABLE public.opportunity_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own labels"
ON public.opportunity_labels FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own labels"
ON public.opportunity_labels FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own labels"
ON public.opportunity_labels FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own labels"
ON public.opportunity_labels FOR DELETE
USING (auth.uid() = user_id);

CREATE TRIGGER update_opportunity_labels_updated_at
BEFORE UPDATE ON public.opportunity_labels
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Tabela de associação entre oportunidades e etiquetas (muitos-para-muitos)
CREATE TABLE IF NOT EXISTS public.opportunity_label_assignments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  label_id uuid NOT NULL REFERENCES public.opportunity_labels(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (opportunity_id, label_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_label_assignments_opportunity_id 
  ON public.opportunity_label_assignments(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_label_assignments_label_id 
  ON public.opportunity_label_assignments(label_id);

ALTER TABLE public.opportunity_label_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own label assignments"
ON public.opportunity_label_assignments FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own label assignments"
ON public.opportunity_label_assignments FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own label assignments"
ON public.opportunity_label_assignments FOR DELETE
USING (auth.uid() = user_id);