ALTER TABLE public.materials DROP CONSTRAINT materials_supplier_id_fkey;
ALTER TABLE public.materials ADD CONSTRAINT materials_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.tour_operators(id);

ALTER TABLE public.drive_import_logs DROP CONSTRAINT drive_import_logs_supplier_id_fkey;
ALTER TABLE public.drive_import_logs ADD CONSTRAINT drive_import_logs_supplier_id_fkey FOREIGN KEY (supplier_id) REFERENCES public.tour_operators(id);