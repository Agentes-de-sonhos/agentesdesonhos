
-- Create media_folders table
CREATE TABLE public.media_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  parent_id uuid REFERENCES public.media_folders(id) ON DELETE CASCADE,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Create media_files table
CREATE TABLE public.media_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  original_name text NOT NULL,
  file_type text NOT NULL, -- 'image', 'pdf', 'video', 'other'
  mime_type text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  storage_path text NOT NULL,
  url text NOT NULL,
  folder_id uuid REFERENCES public.media_folders(id) ON DELETE SET NULL,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.media_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.media_files ENABLE ROW LEVEL SECURITY;

-- RLS: Only admins can manage folders
CREATE POLICY "Admins can manage media folders"
ON public.media_folders FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- RLS: Only admins can manage files
CREATE POLICY "Admins can manage media files"
ON public.media_files FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Indexes
CREATE INDEX idx_media_files_folder_id ON public.media_files(folder_id);
CREATE INDEX idx_media_files_file_type ON public.media_files(file_type);
CREATE INDEX idx_media_files_name ON public.media_files(name);
CREATE INDEX idx_media_folders_parent_id ON public.media_folders(parent_id);

-- Create media-files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('media-files', 'media-files', true);

-- Storage RLS policies for media-files bucket
CREATE POLICY "Admins can upload media files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'media-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update media files"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'media-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete media files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'media-files' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can read media files"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'media-files');

-- Updated_at trigger
CREATE TRIGGER update_media_folders_updated_at
  BEFORE UPDATE ON public.media_folders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_media_files_updated_at
  BEFORE UPDATE ON public.media_files
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
