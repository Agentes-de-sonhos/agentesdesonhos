
-- Allow suppliers (fornecedor) to manage materials for their own operator
CREATE POLICY "Suppliers can view own materials"
ON public.materials FOR SELECT
TO authenticated
USING (
  supplier_id IN (
    SELECT id FROM public.tour_operators WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Suppliers can insert own materials"
ON public.materials FOR INSERT
TO authenticated
WITH CHECK (
  supplier_id IN (
    SELECT id FROM public.tour_operators WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Suppliers can update own materials"
ON public.materials FOR UPDATE
TO authenticated
USING (
  supplier_id IN (
    SELECT id FROM public.tour_operators WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  supplier_id IN (
    SELECT id FROM public.tour_operators WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Suppliers can delete own materials"
ON public.materials FOR DELETE
TO authenticated
USING (
  supplier_id IN (
    SELECT id FROM public.tour_operators WHERE user_id = auth.uid()
  )
);
