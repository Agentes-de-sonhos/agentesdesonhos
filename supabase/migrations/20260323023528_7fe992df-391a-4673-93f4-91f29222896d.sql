
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.crm_contacts ADD COLUMN IF NOT EXISTS subcategory text;
