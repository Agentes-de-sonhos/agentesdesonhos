
CREATE TABLE public.trail_linked_materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trail_id UUID NOT NULL REFERENCES public.learning_trails(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(trail_id, material_id)
);

ALTER TABLE public.trail_linked_materials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage trail linked materials"
  ON public.trail_linked_materials FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Authenticated can view trail linked materials"
  ON public.trail_linked_materials FOR SELECT
  USING (auth.role() = 'authenticated'::text);
