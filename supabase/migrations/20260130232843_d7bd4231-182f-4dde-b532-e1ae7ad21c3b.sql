-- Create quotes table
CREATE TABLE public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_name TEXT NOT NULL,
  adults_count INTEGER NOT NULL DEFAULT 1,
  children_count INTEGER NOT NULL DEFAULT 0,
  destination TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  share_token TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote services table
CREATE TABLE public.quote_services (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  service_data JSONB NOT NULL DEFAULT '{}',
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_services ENABLE ROW LEVEL SECURITY;

-- RLS policies for quotes
CREATE POLICY "Users can view their own quotes" 
ON public.quotes 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own quotes" 
ON public.quotes 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quotes" 
ON public.quotes 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quotes" 
ON public.quotes 
FOR DELETE 
USING (auth.uid() = user_id);

CREATE POLICY "Public can view published quotes by share token" 
ON public.quotes 
FOR SELECT 
USING (status = 'published' AND share_token IS NOT NULL);

-- RLS policies for quote services
CREATE POLICY "Users can manage services of their quotes" 
ON public.quote_services 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_services.quote_id 
    AND quotes.user_id = auth.uid()
  )
);

CREATE POLICY "Public can view services of published quotes" 
ON public.quote_services 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_services.quote_id 
    AND quotes.status = 'published' 
    AND quotes.share_token IS NOT NULL
  )
);

-- Indexes
CREATE INDEX idx_quotes_user_id ON public.quotes(user_id);
CREATE INDEX idx_quotes_share_token ON public.quotes(share_token);
CREATE INDEX idx_quote_services_quote_id ON public.quote_services(quote_id);

-- Triggers for updated_at
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quote_services_updated_at
  BEFORE UPDATE ON public.quote_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();