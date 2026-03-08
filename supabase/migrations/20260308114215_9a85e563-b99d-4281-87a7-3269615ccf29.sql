
ALTER TABLE public.showcase_items
  ADD COLUMN is_featured BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN featured_order INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN featured_label TEXT DEFAULT NULL;
