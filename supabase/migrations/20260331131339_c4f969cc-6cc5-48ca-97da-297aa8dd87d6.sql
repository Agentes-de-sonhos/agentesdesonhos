
ALTER TABLE public.drive_import_logs
  DROP CONSTRAINT drive_import_logs_supplier_id_fkey,
  ADD CONSTRAINT drive_import_logs_supplier_id_fkey
    FOREIGN KEY (supplier_id) REFERENCES public.tour_operators(id)
    ON DELETE SET NULL;
