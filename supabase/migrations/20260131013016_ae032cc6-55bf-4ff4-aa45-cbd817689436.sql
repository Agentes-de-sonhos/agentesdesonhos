-- Create clients table
CREATE TABLE public.clients (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunities table
CREATE TABLE public.opportunities (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  destination TEXT NOT NULL,
  start_date DATE,
  end_date DATE,
  passengers_count INTEGER NOT NULL DEFAULT 1,
  estimated_value DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  stage TEXT NOT NULL DEFAULT 'new_contact',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create opportunity history table
CREATE TABLE public.opportunity_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  from_stage TEXT,
  to_stage TEXT NOT NULL,
  changed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for clients
CREATE POLICY "Users can view their own clients" 
ON public.clients FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own clients" 
ON public.clients FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own clients" 
ON public.clients FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own clients" 
ON public.clients FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for opportunities
CREATE POLICY "Users can view their own opportunities" 
ON public.opportunities FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own opportunities" 
ON public.opportunities FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own opportunities" 
ON public.opportunities FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own opportunities" 
ON public.opportunities FOR DELETE USING (auth.uid() = user_id);

-- RLS policies for opportunity history
CREATE POLICY "Users can view history of their opportunities" 
ON public.opportunity_history FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.opportunities 
  WHERE opportunities.id = opportunity_history.opportunity_id 
  AND opportunities.user_id = auth.uid()
));

CREATE POLICY "Users can create history for their opportunities" 
ON public.opportunity_history FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.opportunities 
  WHERE opportunities.id = opportunity_history.opportunity_id 
  AND opportunities.user_id = auth.uid()
));

-- Indexes
CREATE INDEX idx_clients_user_id ON public.clients(user_id);
CREATE INDEX idx_opportunities_user_id ON public.opportunities(user_id);
CREATE INDEX idx_opportunities_client_id ON public.opportunities(client_id);
CREATE INDEX idx_opportunities_stage ON public.opportunities(stage);
CREATE INDEX idx_opportunity_history_opportunity_id ON public.opportunity_history(opportunity_id);

-- Triggers for updated_at
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_opportunities_updated_at
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();