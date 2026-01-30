-- Create table for generated marketing content
CREATE TABLE public.generated_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('social_caption', 'stories_intro', 'whatsapp_pitch')),
  original_file_url TEXT,
  original_file_name TEXT,
  detected_destination TEXT,
  detected_benefits TEXT[],
  detected_info JSONB,
  generated_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.generated_content ENABLE ROW LEVEL SECURITY;

-- RLS policies for user access
CREATE POLICY "Users can view their own content"
ON public.generated_content
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content"
ON public.generated_content
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content"
ON public.generated_content
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content"
ON public.generated_content
FOR DELETE
USING (auth.uid() = user_id);

-- Index for faster queries
CREATE INDEX idx_generated_content_user_id ON public.generated_content(user_id);
CREATE INDEX idx_generated_content_type ON public.generated_content(content_type);

-- Trigger for updated_at
CREATE TRIGGER update_generated_content_updated_at
BEFORE UPDATE ON public.generated_content
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();