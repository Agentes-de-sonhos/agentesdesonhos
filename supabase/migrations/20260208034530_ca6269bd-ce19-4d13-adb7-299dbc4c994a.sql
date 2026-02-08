-- Update the generate_trip_reminders function with new intervals
-- New intervals: 7, 3, 1, 0 days before start AND 0 days after end (return)
CREATE OR REPLACE FUNCTION public.generate_trip_reminders()
RETURNS TRIGGER AS $$
DECLARE
  days_before_arr INTEGER[] := ARRAY[7, 3, 1, 0];
  days INTEGER;
  reminder_dt DATE;
BEGIN
  -- Generate reminders for each interval before trip start
  FOREACH days IN ARRAY days_before_arr
  LOOP
    reminder_dt := NEW.start_date::DATE - days;
    -- Only create reminder if date is in the future or today
    IF reminder_dt >= CURRENT_DATE THEN
      INSERT INTO public.trip_reminders (trip_id, user_id, reminder_date, days_before)
      VALUES (NEW.id, NEW.user_id, reminder_dt, days);
    END IF;
  END LOOP;
  
  -- Generate return reminder (on end_date for follow-up)
  IF NEW.end_date IS NOT NULL AND NEW.end_date::DATE >= CURRENT_DATE THEN
    INSERT INTO public.trip_reminders (trip_id, user_id, reminder_date, days_before)
    VALUES (NEW.id, NEW.user_id, NEW.end_date::DATE, -1);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;