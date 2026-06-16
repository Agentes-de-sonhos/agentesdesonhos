
-- 1. Add created_by column
ALTER TABLE public.opportunity_followups
  ADD COLUMN IF NOT EXISTS created_by uuid;

-- 2. Backfill created_by from current user_id (preserves authorship)
UPDATE public.opportunity_followups
  SET created_by = user_id
  WHERE created_by IS NULL;

-- 3. Backfill user_id to agency master (agency_id IS the master user_id)
UPDATE public.opportunity_followups f
  SET user_id = m.agency_id
  FROM public.agency_membership m
  WHERE f.user_id = m.user_id
    AND f.user_id <> m.agency_id;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_opportunity_followups_opportunity
  ON public.opportunity_followups(opportunity_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_followups_user
  ON public.opportunity_followups(user_id);
CREATE INDEX IF NOT EXISTS idx_opportunity_followups_created_by
  ON public.opportunity_followups(created_by);
CREATE INDEX IF NOT EXISTS idx_opportunity_followups_date
  ON public.opportunity_followups(follow_up_date);

-- 5. Normalization trigger
CREATE OR REPLACE FUNCTION public.force_followup_agency()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_master uuid;
  v_opp_owner uuid;
BEGIN
  -- Always force created_by to authenticated user (no spoofing).
  -- For service_role/SECURITY DEFINER paths where auth.uid() is null, keep the provided value.
  IF auth.uid() IS NOT NULL THEN
    NEW.created_by := auth.uid();
  ELSIF NEW.created_by IS NULL THEN
    NEW.created_by := NEW.user_id;
  END IF;

  -- Resolve agency master for the authenticated user
  IF auth.uid() IS NOT NULL THEN
    SELECT agency_id INTO v_master
      FROM public.agency_membership
      WHERE user_id = auth.uid()
      LIMIT 1;
    NEW.user_id := COALESCE(v_master, auth.uid());
  END IF;

  -- Validate opportunity belongs to the same agency
  SELECT user_id INTO v_opp_owner
    FROM public.opportunities
    WHERE id = NEW.opportunity_id;

  IF v_opp_owner IS NULL THEN
    RAISE EXCEPTION 'Oportunidade não encontrada';
  END IF;

  IF v_opp_owner <> NEW.user_id THEN
    RAISE EXCEPTION 'Follow-up deve pertencer a uma oportunidade da mesma agência';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_force_followup_agency ON public.opportunity_followups;
CREATE TRIGGER trg_force_followup_agency
  BEFORE INSERT OR UPDATE ON public.opportunity_followups
  FOR EACH ROW
  EXECUTE FUNCTION public.force_followup_agency();

-- 6. Replace RLS policies with operation-specific ones
DROP POLICY IF EXISTS "Users manage own followups" ON public.opportunity_followups;

-- SELECT: any agency member, plus original author for legacy rows
CREATE POLICY "followups_select_agency"
  ON public.opportunity_followups
  FOR SELECT
  TO authenticated
  USING (
    public.is_agency_member(user_id)
    OR auth.uid() = created_by
  );

-- INSERT: any agency member (trigger normalizes user_id/created_by + validates opportunity)
CREATE POLICY "followups_insert_agency"
  ON public.opportunity_followups
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_agency_member(user_id)
  );

-- UPDATE: only original author or agency master
CREATE POLICY "followups_update_author_or_master"
  ON public.opportunity_followups
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = user_id  -- user_id == agency master
  )
  WITH CHECK (
    public.is_agency_member(user_id)
  );

-- DELETE: only original author or agency master (used by "concluir follow-up")
CREATE POLICY "followups_delete_author_or_master"
  ON public.opportunity_followups
  FOR DELETE
  TO authenticated
  USING (
    auth.uid() = created_by
    OR auth.uid() = user_id
  );
