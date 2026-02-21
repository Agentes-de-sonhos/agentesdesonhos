
-- Create trip edit history table
CREATE TABLE public.trip_edit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  field_changed TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trip_edit_history ENABLE ROW LEVEL SECURITY;

-- Users can view history of their trips
CREATE POLICY "Users can view their trip edit history"
ON public.trip_edit_history
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.trips WHERE trips.id = trip_edit_history.trip_id AND trips.user_id = auth.uid()
));

-- Users can create history for their trips
CREATE POLICY "Users can create trip edit history"
ON public.trip_edit_history
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Create index for performance
CREATE INDEX idx_trip_edit_history_trip_id ON public.trip_edit_history(trip_id);
