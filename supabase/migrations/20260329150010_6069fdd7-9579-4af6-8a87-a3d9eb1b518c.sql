
-- Table to track imported files from Google Drive (avoid duplicates)
CREATE TABLE public.drive_import_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  drive_file_id TEXT NOT NULL,
  drive_file_name TEXT NOT NULL,
  drive_folder_name TEXT NOT NULL,
  supplier_name TEXT,
  supplier_id UUID REFERENCES public.trade_suppliers(id) ON DELETE SET NULL,
  material_id UUID REFERENCES public.materials(id) ON DELETE SET NULL,
  category TEXT,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  imported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '7 days'),
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Index for dedup check
CREATE UNIQUE INDEX idx_drive_import_drive_file_id ON public.drive_import_logs(drive_file_id);
CREATE INDEX idx_drive_import_status ON public.drive_import_logs(status);
CREATE INDEX idx_drive_import_expires ON public.drive_import_logs(expires_at);

-- Table to store Drive config (folder ID, mapping)
CREATE TABLE public.drive_import_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  root_folder_id TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.drive_import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.drive_import_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage drive_import_logs"
ON public.drive_import_logs
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage drive_import_config"
ON public.drive_import_config
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
