-- Preserve original authorship of opportunity follow-ups on UPDATE.
-- The previous trigger overwrote created_by (and re-normalized user_id) on every UPDATE,
-- which caused the last editor of the opportunity to become the "author" of all follow-ups.

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
  IF TG_OP = 'INSERT' THEN
    -- Force created_by to authenticated user (no spoofing) on creation only
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
  ELSE
    -- UPDATE: authorship and agency ownership are IMMUTABLE.
    -- Ignore any attempt to change created_by or user_id.
    NEW.created_by := OLD.created_by;
    NEW.user_id := OLD.user_id;
  END IF;

  -- Validate opportunity belongs to the same agency (both insert and update)
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