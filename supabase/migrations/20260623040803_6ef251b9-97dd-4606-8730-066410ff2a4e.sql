
-- Mirror opportunity follow-ups into agency_events so they sync to Google Calendar.

ALTER TABLE public.agency_events
  ADD COLUMN IF NOT EXISTS followup_id uuid UNIQUE
    REFERENCES public.opportunity_followups(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_agency_events_followup_id
  ON public.agency_events(followup_id) WHERE followup_id IS NOT NULL;

-- Trigger: mirror followups -> agency_events
CREATE OR REPLACE FUNCTION public.sync_followup_to_agency_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner uuid;
  v_client_id uuid;
  v_client_name text;
  v_title text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    -- Soft-delete the mirror so the Google sync engine creates a tombstone.
    UPDATE public.agency_events
       SET deleted_at = now()
     WHERE followup_id = OLD.id
       AND deleted_at IS NULL;
    RETURN OLD;
  END IF;

  -- Resolve owner of the calendar mirror = creator of the followup.
  v_owner := COALESCE(NEW.created_by, NEW.user_id);

  SELECT o.client_id, c.name
    INTO v_client_id, v_client_name
    FROM public.opportunities o
    LEFT JOIN public.clients c ON c.id = o.client_id
   WHERE o.id = NEW.opportunity_id;

  v_title := CASE
    WHEN v_client_name IS NOT NULL AND length(trim(v_client_name)) > 0
      THEN 'Follow-up: ' || v_client_name
    ELSE 'Follow-up'
  END;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.agency_events
      (user_id, title, description, event_type, event_date, color,
       client_id, opportunity_id, followup_id)
    VALUES
      (v_owner, v_title, NEW.note, 'followup', NEW.follow_up_date, '#8b5cf6',
       v_client_id, NEW.opportunity_id, NEW.id)
    ON CONFLICT (followup_id) DO UPDATE
      SET title = EXCLUDED.title,
          description = EXCLUDED.description,
          event_date = EXCLUDED.event_date,
          client_id = EXCLUDED.client_id,
          opportunity_id = EXCLUDED.opportunity_id,
          deleted_at = NULL,
          updated_at = now();
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.agency_events
       SET title = v_title,
           description = NEW.note,
           event_date = NEW.follow_up_date,
           client_id = v_client_id,
           opportunity_id = NEW.opportunity_id,
           deleted_at = NULL,
           updated_at = now()
     WHERE followup_id = NEW.id;

    -- If no mirror existed (legacy followup), create one.
    IF NOT FOUND THEN
      INSERT INTO public.agency_events
        (user_id, title, description, event_type, event_date, color,
         client_id, opportunity_id, followup_id)
      VALUES
        (v_owner, v_title, NEW.note, 'followup', NEW.follow_up_date, '#8b5cf6',
         v_client_id, NEW.opportunity_id, NEW.id);
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_followup_to_agency_event ON public.opportunity_followups;
CREATE TRIGGER trg_sync_followup_to_agency_event
AFTER INSERT OR UPDATE OR DELETE ON public.opportunity_followups
FOR EACH ROW EXECUTE FUNCTION public.sync_followup_to_agency_event();

-- Reverse: when the mirror is soft-deleted (e.g. user removed the event in Google),
-- propagate by deleting the original followup so the CRM stays consistent.
CREATE OR REPLACE FUNCTION public.propagate_agency_event_delete_to_followup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.followup_id IS NOT NULL
     AND NEW.deleted_at IS NOT NULL
     AND (OLD.deleted_at IS NULL) THEN
    DELETE FROM public.opportunity_followups WHERE id = NEW.followup_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_propagate_agency_event_delete_to_followup ON public.agency_events;
CREATE TRIGGER trg_propagate_agency_event_delete_to_followup
AFTER UPDATE OF deleted_at ON public.agency_events
FOR EACH ROW EXECUTE FUNCTION public.propagate_agency_event_delete_to_followup();

-- Backfill existing followups into agency_events (only the missing ones).
INSERT INTO public.agency_events
  (user_id, title, description, event_type, event_date, color,
   client_id, opportunity_id, followup_id)
SELECT
  COALESCE(f.created_by, f.user_id) AS user_id,
  CASE WHEN c.name IS NOT NULL AND length(trim(c.name)) > 0
       THEN 'Follow-up: ' || c.name ELSE 'Follow-up' END AS title,
  f.note,
  'followup',
  f.follow_up_date,
  '#8b5cf6',
  o.client_id,
  f.opportunity_id,
  f.id
FROM public.opportunity_followups f
LEFT JOIN public.opportunities o ON o.id = f.opportunity_id
LEFT JOIN public.clients c ON c.id = o.client_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.agency_events ae WHERE ae.followup_id = f.id
);
