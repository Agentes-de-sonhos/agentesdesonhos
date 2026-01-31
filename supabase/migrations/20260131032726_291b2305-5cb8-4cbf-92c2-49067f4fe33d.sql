-- Add agency_logo_url to profiles table
ALTER TABLE public.profiles
ADD COLUMN agency_logo_url TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.profiles.agency_logo_url IS 'URL of the agency logo stored in storage bucket';