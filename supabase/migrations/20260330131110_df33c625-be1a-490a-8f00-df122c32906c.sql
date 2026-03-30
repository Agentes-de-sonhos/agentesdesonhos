
-- Migrate niche (text) to niches (text array) for multiple selection
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS niches text[] DEFAULT '{}';

-- Copy existing niche values into niches array
UPDATE public.profiles SET niches = ARRAY[niche] WHERE niche IS NOT NULL AND niche != '' AND (niches IS NULL OR niches = '{}');

-- Add new fields for networking
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS help_offer text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS partnership_interests text[];
