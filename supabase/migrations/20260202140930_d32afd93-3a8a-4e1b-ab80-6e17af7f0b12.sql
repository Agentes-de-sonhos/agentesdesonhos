-- Create global_popups table for admin-controlled announcements
CREATE TABLE public.global_popups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  button_text TEXT,
  button_link TEXT,
  has_button BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT false,
  start_date TIMESTAMPTZ,
  end_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.global_popups ENABLE ROW LEVEL SECURITY;

-- Admins can manage popups
CREATE POLICY "Admins can manage popups"
ON public.global_popups
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- All authenticated users can view active popups
CREATE POLICY "Authenticated users can view active popups"
ON public.global_popups
FOR SELECT
USING (
  auth.uid() IS NOT NULL 
  AND is_active = true
  AND (start_date IS NULL OR start_date <= now())
  AND (end_date IS NULL OR end_date >= now())
);

-- Create updated_at trigger
CREATE TRIGGER update_global_popups_updated_at
BEFORE UPDATE ON public.global_popups
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for popup images
INSERT INTO storage.buckets (id, name, public)
VALUES ('popup-images', 'popup-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for popup images
CREATE POLICY "Anyone can view popup images"
ON storage.objects FOR SELECT
USING (bucket_id = 'popup-images');

CREATE POLICY "Admins can upload popup images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'popup-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can update popup images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'popup-images' 
  AND public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Admins can delete popup images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'popup-images' 
  AND public.has_role(auth.uid(), 'admin')
);