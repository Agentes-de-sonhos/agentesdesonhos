-- RPC to inherit stage permissions from a source stage to a newly-duplicated stage.
-- Callable by agency master OR any team member of the same agency.
-- Copies every team_member_id row for that pipeline/source stage, replacing stage_id
-- with the new stage id. Idempotent via ON CONFLICT.
CREATE OR REPLACE FUNCTION public.inherit_stage_permissions(
  _pipeline public.team_pipeline_type,
  _source_stage_id uuid,
  _new_stage_id uuid
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _agency_id uuid;
BEGIN
  -- Resolve caller's agency: master = auth.uid(); team member = mapped agency_id.
  SELECT COALESCE(
    (SELECT agency_id FROM public.agency_membership WHERE user_id = auth.uid() LIMIT 1),
    auth.uid()
  ) INTO _agency_id;

  IF _agency_id IS NULL THEN
    RAISE EXCEPTION 'No agency context for current user';
  END IF;

  INSERT INTO public.agency_team_stage_permissions
    (agency_id, team_member_id, pipeline_type, stage_id, can_view, can_edit, can_move)
  SELECT
    s.agency_id, s.team_member_id, s.pipeline_type, _new_stage_id,
    s.can_view, s.can_edit, s.can_move
  FROM public.agency_team_stage_permissions s
  WHERE s.agency_id = _agency_id
    AND s.pipeline_type = _pipeline
    AND s.stage_id = _source_stage_id
  ON CONFLICT (team_member_id, pipeline_type, stage_id) DO UPDATE
    SET can_view = EXCLUDED.can_view,
        can_edit = EXCLUDED.can_edit,
        can_move = EXCLUDED.can_move;
END;
$$;

GRANT EXECUTE ON FUNCTION public.inherit_stage_permissions(public.team_pipeline_type, uuid, uuid) TO authenticated;