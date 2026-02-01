-- Create table for promoter presentations (leads)
CREATE TABLE public.promoter_presentations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  promoter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  agency_name TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  agent_email TEXT NOT NULL,
  agent_whatsapp TEXT NOT NULL,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for tracking feature usage per presentation
CREATE TABLE public.promoter_presentation_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  presentation_id UUID NOT NULL REFERENCES public.promoter_presentations(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(presentation_id, feature_name)
);

-- Enable RLS
ALTER TABLE public.promoter_presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_presentation_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for promoter_presentations
CREATE POLICY "Promoters can view their own presentations"
ON public.promoter_presentations
FOR SELECT
TO authenticated
USING (
  promoter_id = auth.uid() OR 
  public.has_role(auth.uid(), 'admin')
);

CREATE POLICY "Promoters can create presentations"
ON public.promoter_presentations
FOR INSERT
TO authenticated
WITH CHECK (
  promoter_id = auth.uid() AND
  public.has_role(auth.uid(), 'promotor')
);

CREATE POLICY "Promoters can update their own presentations"
ON public.promoter_presentations
FOR UPDATE
TO authenticated
USING (promoter_id = auth.uid())
WITH CHECK (promoter_id = auth.uid());

-- RLS policies for promoter_presentation_usage
CREATE POLICY "Users can view usage for their presentations"
ON public.promoter_presentation_usage
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.promoter_presentations pp 
    WHERE pp.id = presentation_id 
    AND (pp.promoter_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
);

CREATE POLICY "Users can insert usage for their presentations"
ON public.promoter_presentation_usage
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.promoter_presentations pp 
    WHERE pp.id = presentation_id 
    AND pp.promoter_id = auth.uid()
    AND pp.is_active = true
  )
);

-- Function to check if promoter has active presentation
CREATE OR REPLACE FUNCTION public.get_active_presentation(_user_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.promoter_presentations
  WHERE promoter_id = _user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1
$$;

-- Function to check if feature was used in current presentation
CREATE OR REPLACE FUNCTION public.can_use_feature(_user_id uuid, _feature text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  active_presentation_id uuid;
BEGIN
  -- Get active presentation
  SELECT id INTO active_presentation_id
  FROM public.promoter_presentations
  WHERE promoter_id = _user_id
    AND is_active = true
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF active_presentation_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Check if feature was already used
  RETURN NOT EXISTS (
    SELECT 1 FROM public.promoter_presentation_usage
    WHERE presentation_id = active_presentation_id
      AND feature_name = _feature
  );
END;
$$;

-- Add updated_at trigger
CREATE TRIGGER update_promoter_presentations_updated_at
BEFORE UPDATE ON public.promoter_presentations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add indexes for better performance
CREATE INDEX idx_promoter_presentations_promoter ON public.promoter_presentations(promoter_id);
CREATE INDEX idx_promoter_presentations_active ON public.promoter_presentations(is_active) WHERE is_active = true;
CREATE INDEX idx_promoter_presentation_usage_presentation ON public.promoter_presentation_usage(presentation_id);