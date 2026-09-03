REVOKE SELECT ON public.sitelab_templates FROM authenticated;
DROP POLICY IF EXISTS "Admins can manage sitelab templates" ON public.sitelab_templates;
GRANT ALL ON public.sitelab_templates TO service_role;