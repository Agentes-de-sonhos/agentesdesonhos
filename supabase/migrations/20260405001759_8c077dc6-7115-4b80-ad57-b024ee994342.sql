
ALTER TABLE public.notes ADD COLUMN is_template boolean NOT NULL DEFAULT false;

CREATE INDEX idx_notes_is_template_user ON public.notes (user_id, is_template) WHERE is_template = true;
