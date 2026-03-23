
-- Remove duplicate emails, keeping the most recently updated one
DELETE FROM public.crm_contacts a
USING public.crm_contacts b
WHERE a.email = b.email
  AND a.updated_at < b.updated_at;

-- Now add unique constraint
ALTER TABLE public.crm_contacts ADD CONSTRAINT crm_contacts_email_unique UNIQUE (email);
