CREATE OR REPLACE FUNCTION public.image_library_can(_action text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE _action
    WHEN 'view'   THEN public.can_team('quotes.view')  OR public.can_team('wallet.view')
    WHEN 'create' THEN public.can_team('quotes.create') OR public.can_team('quotes.edit') OR public.can_team('wallet.create') OR public.can_team('wallet.edit')
    WHEN 'edit'   THEN public.can_team('quotes.edit')  OR public.can_team('wallet.edit')
    WHEN 'delete' THEN public.can_team('quotes.delete') OR public.can_team('wallet.delete')
    ELSE false END
$$;
REVOKE ALL ON FUNCTION public.image_library_can(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.image_library_can(text) TO authenticated;

DROP POLICY IF EXISTS "agency members read folders" ON public.agency_image_folders;
DROP POLICY IF EXISTS "agency members insert folders" ON public.agency_image_folders;
DROP POLICY IF EXISTS "agency members update folders" ON public.agency_image_folders;
DROP POLICY IF EXISTS "agency members delete folders" ON public.agency_image_folders;
DROP POLICY IF EXISTS "agency members read images" ON public.agency_image_library;
DROP POLICY IF EXISTS "agency members insert images" ON public.agency_image_library;
DROP POLICY IF EXISTS "agency members update images" ON public.agency_image_library;
DROP POLICY IF EXISTS "agency members delete images" ON public.agency_image_library;

CREATE POLICY "library folders read" ON public.agency_image_folders FOR SELECT TO authenticated
  USING (agency_id = public.current_image_library_agency() AND public.image_library_can('view'));
CREATE POLICY "library folders insert" ON public.agency_image_folders FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_image_library_agency() AND public.image_library_can('edit'));
CREATE POLICY "library folders update" ON public.agency_image_folders FOR UPDATE TO authenticated
  USING (agency_id = public.current_image_library_agency() AND public.image_library_can('edit'))
  WITH CHECK (agency_id = public.current_image_library_agency());
CREATE POLICY "library folders delete" ON public.agency_image_folders FOR DELETE TO authenticated
  USING (agency_id = public.current_image_library_agency() AND public.image_library_can('delete'));

CREATE POLICY "library images read" ON public.agency_image_library FOR SELECT TO authenticated
  USING (agency_id = public.current_image_library_agency() AND public.image_library_can('view'));
CREATE POLICY "library images insert" ON public.agency_image_library FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_image_library_agency() AND public.image_library_can('create'));
CREATE POLICY "library images update" ON public.agency_image_library FOR UPDATE TO authenticated
  USING (agency_id = public.current_image_library_agency() AND public.image_library_can('edit'))
  WITH CHECK (agency_id = public.current_image_library_agency());
CREATE POLICY "library images delete" ON public.agency_image_library FOR DELETE TO authenticated
  USING (agency_id = public.current_image_library_agency() AND public.image_library_can('delete'));