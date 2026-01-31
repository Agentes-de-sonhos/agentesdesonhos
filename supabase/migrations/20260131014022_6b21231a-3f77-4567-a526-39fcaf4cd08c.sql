-- Create trip_reminders table
CREATE TABLE public.trip_reminders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  reminder_date DATE NOT NULL,
  days_before INTEGER NOT NULL,
  follow_up_note TEXT,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.trip_reminders ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own reminders" 
ON public.trip_reminders 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own reminders" 
ON public.trip_reminders 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own reminders" 
ON public.trip_reminders 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reminders" 
ON public.trip_reminders 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_trip_reminders_updated_at
BEFORE UPDATE ON public.trip_reminders
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster queries
CREATE INDEX idx_trip_reminders_user_date ON public.trip_reminders(user_id, reminder_date);
CREATE INDEX idx_trip_reminders_trip_id ON public.trip_reminders(trip_id);

-- Function to generate reminders for a trip
CREATE OR REPLACE FUNCTION public.generate_trip_reminders()
RETURNS TRIGGER AS $$
DECLARE
  days_before_arr INTEGER[] := ARRAY[30, 15, 7, 2];
  days INTEGER;
  reminder_dt DATE;
BEGIN
  -- Generate reminders for each interval
  FOREACH days IN ARRAY days_before_arr
  LOOP
    reminder_dt := NEW.start_date::DATE - days;
    -- Only create reminder if date is in the future
    IF reminder_dt >= CURRENT_DATE THEN
      INSERT INTO public.trip_reminders (trip_id, user_id, reminder_date, days_before)
      VALUES (NEW.id, NEW.user_id, reminder_dt, days);
    END IF;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger to auto-generate reminders when a trip is created
CREATE TRIGGER trip_create_reminders
AFTER INSERT ON public.trips
FOR EACH ROW
EXECUTE FUNCTION public.generate_trip_reminders();