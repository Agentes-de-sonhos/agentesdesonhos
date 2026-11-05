-- Biblioteca de mídias: isolamento total por agência
CREATE OR REPLACE FUNCTION public.same_agency_as(_owner uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _owner IS NOT NULL AND auth.uid() IS NOT NULL
    AND public.user_agency_id(_owner) = public.user_agency_id(auth.uid())
$$;
REVOKE EXECUTE ON FUNCTION public.same_agency_as(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.same_agency_as(uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS "Authenticated users can read media files" ON public.media_files;
CREATE POLICY "Agency reads own media files" ON public.media_files FOR SELECT TO authenticated
  USING (public.same_agency_as(uploaded_by));
CREATE POLICY "Agency updates own media files" ON public.media_files FOR UPDATE TO authenticated
  USING (public.same_agency_as(uploaded_by)) WITH CHECK (public.same_agency_as(uploaded_by));
CREATE POLICY "Agency deletes own media files" ON public.media_files FOR DELETE TO authenticated
  USING (public.same_agency_as(uploaded_by));

DROP POLICY IF EXISTS "Authenticated users can read media folders" ON public.media_folders;
CREATE POLICY "Agency reads own media folders" ON public.media_folders FOR SELECT TO authenticated
  USING (public.same_agency_as(created_by));
CREATE POLICY "Agency updates own media folders" ON public.media_folders FOR UPDATE TO authenticated
  USING (public.same_agency_as(created_by)) WITH CHECK (public.same_agency_as(created_by));
CREATE POLICY "Agency deletes own media folders" ON public.media_folders FOR DELETE TO authenticated
  USING (public.same_agency_as(created_by));

-- Storage: arquivos continuam abertos por link público (sites e orçamentos),
-- mas só a agência dona (ou admin) pode substituir ou apagar.
DROP POLICY IF EXISTS "Authenticated users can update media files" ON storage.objects;
CREATE POLICY "Agency updates own media objects" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'media-files' AND (public.same_agency_as(owner) OR public.has_role(auth.uid(), 'admin')))
  WITH CHECK (bucket_id = 'media-files');
DROP POLICY IF EXISTS "Authenticated users can delete media files" ON storage.objects;
CREATE POLICY "Agency deletes own media objects" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'media-files' AND (public.same_agency_as(owner) OR public.has_role(auth.uid(), 'admin')));