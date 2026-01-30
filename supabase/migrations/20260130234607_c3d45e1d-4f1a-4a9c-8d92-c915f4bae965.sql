-- Create trips table
CREATE TABLE public.trips (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create trip services table
CREATE TABLE public.trip_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trip_id UUID NOT NULL REFERENCES public.trips(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_data JSONB NOT NULL DEFAULT '{}',
  voucher_url TEXT,
  voucher_name TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trip_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for trips
CREATE POLICY "Users can view their own trips" 
ON public.trips 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own trips" 
ON public.trips 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own trips" 
ON public.trips 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own trips" 
ON public.trips 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view shared trips" 
ON public.trips 
FOR SELECT 
USING (share_token IS NOT NULL);

-- RLS policies for trip services
CREATE POLICY "Users can manage services of their trips" 
ON public.trip_services 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.trips 
    WHERE trips.id = trip_services.trip_id 
    AND trips.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view services of shared trips" 
ON public.trip_services 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.trips 
    WHERE trips.id = trip_services.trip_id 
    AND trips.share_token IS NOT NULL
  )
);

-- Create storage bucket for vouchers
INSERT INTO storage.buckets (id, name, public) VALUES ('vouchers', 'vouchers', true);

-- Storage policies for vouchers
CREATE POLICY "Users can upload vouchers" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'vouchers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their vouchers" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'vouchers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their vouchers" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'vouchers' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Anyone can view vouchers" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'vouchers');

-- Indexes
CREATE INDEX idx_trips_user_id ON public.trips(user_id);
CREATE INDEX idx_trips_share_token ON public.trips(share_token);
CREATE INDEX idx_trip_services_trip_id ON public.trip_services(trip_id);

-- Triggers for updated_at
CREATE TRIGGER update_trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trip_services_updated_at
  BEFORE UPDATE ON public.trip_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();