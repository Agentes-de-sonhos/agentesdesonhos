
ALTER TABLE public.crm_contacts 
  ADD COLUMN category_id UUID REFERENCES public.client_categories(id) ON DELETE SET NULL,
  ADD COLUMN subcategory_id UUID REFERENCES public.client_subcategories(id) ON DELETE SET NULL;

CREATE INDEX idx_crm_contacts_category ON public.crm_contacts(category_id);
CREATE INDEX idx_crm_contacts_subcategory ON public.crm_contacts(subcategory_id);
