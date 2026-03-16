
CREATE OR REPLACE FUNCTION public.generate_trip_reminders()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  days_before_arr INTEGER[] := ARRAY[10, 3, 1, 0];
  days INTEGER;
  reminder_dt DATE;
BEGIN
  -- Generate reminders for each interval before trip start
  FOREACH days IN ARRAY days_before_arr
  LOOP
    reminder_dt := NEW.start_date::DATE - days;
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
$function$;
