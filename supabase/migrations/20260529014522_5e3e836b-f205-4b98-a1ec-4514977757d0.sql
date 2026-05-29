
-- Remove a FK rígida (stage_id pode vir de pipeline_stages OU operation_pipeline_stages)
ALTER TABLE public.agency_team_stage_permissions
  DROP CONSTRAINT IF EXISTS agency_team_stage_permissions_stage_id_fkey;

-- Trigger para limpar permissões quando uma etapa é excluída
CREATE OR REPLACE FUNCTION public.cleanup_team_stage_perms_on_pipeline_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.agency_team_stage_permissions
   WHERE stage_id = OLD.id AND pipeline_type = 'opportunities';
  RETURN OLD;
END $$;

CREATE OR REPLACE FUNCTION public.cleanup_team_stage_perms_on_operation_delete()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  DELETE FROM public.agency_team_stage_permissions
   WHERE stage_id = OLD.id AND pipeline_type = 'operations';
  RETURN OLD;
END $$;

DROP TRIGGER IF EXISTS trg_team_perm_cleanup_pipeline ON public.pipeline_stages;
CREATE TRIGGER trg_team_perm_cleanup_pipeline
AFTER DELETE ON public.pipeline_stages
FOR EACH ROW EXECUTE FUNCTION public.cleanup_team_stage_perms_on_pipeline_delete();

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'operation_pipeline_stages') THEN
    EXECUTE 'DROP TRIGGER IF EXISTS trg_team_perm_cleanup_operations ON public.operation_pipeline_stages';
    EXECUTE 'CREATE TRIGGER trg_team_perm_cleanup_operations
             AFTER DELETE ON public.operation_pipeline_stages
             FOR EACH ROW EXECUTE FUNCTION public.cleanup_team_stage_perms_on_operation_delete()';
  END IF;
END $$;
