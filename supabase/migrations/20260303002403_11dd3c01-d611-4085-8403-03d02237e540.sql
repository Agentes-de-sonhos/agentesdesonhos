-- Add order_index to materials for drag-and-drop ordering within galleries
ALTER TABLE public.materials ADD COLUMN order_index integer NOT NULL DEFAULT 0;