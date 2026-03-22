
-- Add client_id to quotes table
ALTER TABLE public.quotes ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client_id to itineraries table
ALTER TABLE public.itineraries ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Add client_id to trips table
ALTER TABLE public.trips ADD COLUMN client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Create indexes for efficient lookups
CREATE INDEX idx_quotes_client_id ON public.quotes(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_itineraries_client_id ON public.itineraries(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_trips_client_id ON public.trips(client_id) WHERE client_id IS NOT NULL;
