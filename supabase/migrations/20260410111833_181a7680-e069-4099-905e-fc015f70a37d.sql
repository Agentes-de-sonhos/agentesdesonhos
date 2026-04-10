ALTER TABLE public.materials ADD COLUMN batch_id text;

CREATE INDEX idx_materials_batch_id ON public.materials (batch_id);