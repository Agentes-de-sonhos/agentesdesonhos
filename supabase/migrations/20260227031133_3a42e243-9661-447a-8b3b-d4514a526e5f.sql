
DROP POLICY IF EXISTS "Anyone can read approved or suggested noticias_dashboard" ON public.noticias_dashboard;

CREATE POLICY "Anyone can read approved noticias_dashboard"
ON public.noticias_dashboard
FOR SELECT
TO authenticated
USING (status = 'aprovado');
