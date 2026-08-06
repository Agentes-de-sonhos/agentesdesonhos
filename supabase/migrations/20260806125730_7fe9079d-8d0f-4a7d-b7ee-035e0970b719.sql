CREATE TABLE public.material_import_sources (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id uuid NOT NULL REFERENCES public.tour_operators(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google_drive',
  label text,
  folder_url text NOT NULL,
  folder_id text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  last_sync_at timestamptz,
  last_sync_result jsonb,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_import_sources TO authenticated;
GRANT ALL ON public.material_import_sources TO service_role;
ALTER TABLE public.material_import_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage material import sources"
  ON public.material_import_sources FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_material_import_sources_supplier ON public.material_import_sources(supplier_id);
CREATE UNIQUE INDEX idx_material_import_sources_provider_folder ON public.material_import_sources(provider, folder_id);

CREATE TRIGGER trg_material_import_sources_updated_at
  BEFORE UPDATE ON public.material_import_sources
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.material_imported_files (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  source_id uuid REFERENCES public.material_import_sources(id) ON DELETE SET NULL,
  supplier_id uuid NOT NULL REFERENCES public.tour_operators(id) ON DELETE CASCADE,
  provider text NOT NULL DEFAULT 'google_drive',
  provider_file_id text NOT NULL,
  file_name text NOT NULL,
  mime_type text,
  size_bytes bigint,
  source_url text,
  storage_bucket text NOT NULL DEFAULT 'materials-imports',
  storage_path text NOT NULL,
  status text NOT NULL DEFAULT 'a_revisar',
  material_id uuid REFERENCES public.materials(id) ON DELETE SET NULL,
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by uuid,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT material_imported_files_status_check CHECK (status IN ('a_revisar','aprovado','descartado'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.material_imported_files TO authenticated;
GRANT ALL ON public.material_imported_files TO service_role;
ALTER TABLE public.material_imported_files ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins manage material imported files"
  ON public.material_imported_files FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE UNIQUE INDEX idx_material_imported_files_provider_file
  ON public.material_imported_files(provider, provider_file_id);
CREATE INDEX idx_material_imported_files_supplier_status
  ON public.material_imported_files(supplier_id, status);
CREATE INDEX idx_material_imported_files_source
  ON public.material_imported_files(source_id);

CREATE TRIGGER trg_material_imported_files_updated_at
  BEFORE UPDATE ON public.material_imported_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();