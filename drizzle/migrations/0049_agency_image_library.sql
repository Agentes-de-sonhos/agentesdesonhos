CREATE OR REPLACE FUNCTION public.current_image_library_agency()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT CASE WHEN auth.uid() IS NULL THEN NULL ELSE public.wallet_agency_owner(auth.uid()) END
$$;
REVOKE ALL ON FUNCTION public.current_image_library_agency() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_image_library_agency() TO authenticated;

CREATE TABLE public.agency_image_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 80),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_image_folders TO authenticated;
GRANT ALL ON public.agency_image_folders TO service_role;
ALTER TABLE public.agency_image_folders ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.agency_image_library (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  url text NOT NULL CHECK (url ~ '^https?://[^\s]+$' AND char_length(url) <= 2048),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  folder_id uuid REFERENCES public.agency_image_folders(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual','service_link')),
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (agency_id, url)
);
CREATE INDEX agency_image_library_agency_idx ON public.agency_image_library (agency_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.agency_image_library TO authenticated;
GRANT ALL ON public.agency_image_library TO service_role;
ALTER TABLE public.agency_image_library ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.agency_image_library_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _agency uuid := public.current_image_library_agency();
BEGIN
  IF _agency IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF TG_OP = 'INSERT' THEN
    NEW.agency_id := _agency;
    NEW.created_by := auth.uid();
  ELSE
    NEW.agency_id := OLD.agency_id;
    NEW.created_by := OLD.created_by;
    NEW.created_at := OLD.created_at;
  END IF;
  NEW.updated_at := now();
  NEW.name := btrim(NEW.name);
  IF TG_TABLE_NAME = 'agency_image_library' THEN
    NEW.url := btrim(NEW.url);
    IF NEW.folder_id IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.agency_image_folders f WHERE f.id = NEW.folder_id AND f.agency_id = NEW.agency_id
    ) THEN RAISE EXCEPTION 'invalid folder'; END IF;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER agency_image_folders_guard BEFORE INSERT OR UPDATE ON public.agency_image_folders
  FOR EACH ROW EXECUTE FUNCTION public.agency_image_library_guard();
CREATE TRIGGER agency_image_library_guard BEFORE INSERT OR UPDATE ON public.agency_image_library
  FOR EACH ROW EXECUTE FUNCTION public.agency_image_library_guard();

CREATE POLICY "agency members read folders" ON public.agency_image_folders FOR SELECT TO authenticated
  USING (agency_id = public.current_image_library_agency());
CREATE POLICY "agency members insert folders" ON public.agency_image_folders FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_image_library_agency());
CREATE POLICY "agency members update folders" ON public.agency_image_folders FOR UPDATE TO authenticated
  USING (agency_id = public.current_image_library_agency()) WITH CHECK (agency_id = public.current_image_library_agency());
CREATE POLICY "agency members delete folders" ON public.agency_image_folders FOR DELETE TO authenticated
  USING (agency_id = public.current_image_library_agency());

CREATE POLICY "agency members read images" ON public.agency_image_library FOR SELECT TO authenticated
  USING (agency_id = public.current_image_library_agency());
CREATE POLICY "agency members insert images" ON public.agency_image_library FOR INSERT TO authenticated
  WITH CHECK (agency_id = public.current_image_library_agency());
CREATE POLICY "agency members update images" ON public.agency_image_library FOR UPDATE TO authenticated
  USING (agency_id = public.current_image_library_agency()) WITH CHECK (agency_id = public.current_image_library_agency());
CREATE POLICY "agency members delete images" ON public.agency_image_library FOR DELETE TO authenticated
  USING (agency_id = public.current_image_library_agency());