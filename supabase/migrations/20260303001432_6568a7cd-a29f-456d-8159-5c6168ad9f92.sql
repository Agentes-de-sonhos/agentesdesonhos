
-- Add trail_id to materials table so materials can be exclusive to a trail
ALTER TABLE public.materials 
ADD COLUMN trail_id uuid REFERENCES public.learning_trails(id) ON DELETE SET NULL DEFAULT NULL;

-- Index for performance
CREATE INDEX idx_materials_trail_id ON public.materials(trail_id);
