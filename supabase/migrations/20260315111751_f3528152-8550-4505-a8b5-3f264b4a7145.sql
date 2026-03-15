
ALTER TABLE public.agency_showcases
  ADD COLUMN IF NOT EXISTS tagline text DEFAULT null,
  ADD COLUMN IF NOT EXISTS showcase_mode text DEFAULT 'manual' NOT NULL,
  ADD COLUMN IF NOT EXISTS auto_supplier_ids text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS max_auto_items integer DEFAULT 20,
  ADD COLUMN IF NOT EXISTS auto_categories text[] DEFAULT '{}';
