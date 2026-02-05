
-- Add new columns to clients table
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'lead' CHECK (status IN ('lead', 'em_negociacao', 'cliente_ativo', 'fidelizado')),
ADD COLUMN IF NOT EXISTS travel_preferences text,
ADD COLUMN IF NOT EXISTS internal_notes text,
ADD COLUMN IF NOT EXISTS last_interaction_at timestamp with time zone DEFAULT now();

-- Create sales_goals table for monthly targets
CREATE TABLE IF NOT EXISTS public.sales_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL,
  target_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(user_id, month, year)
);

-- Enable RLS on sales_goals
ALTER TABLE public.sales_goals ENABLE ROW LEVEL SECURITY;

-- RLS policies for sales_goals
CREATE POLICY "Users can view their own goals"
ON public.sales_goals FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals"
ON public.sales_goals FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals"
ON public.sales_goals FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals"
ON public.sales_goals FOR DELETE
USING (auth.uid() = user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_sales_goals_updated_at
BEFORE UPDATE ON public.sales_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add client_id to sales table to link sales to clients
ALTER TABLE public.sales 
ADD COLUMN IF NOT EXISTS client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL;

-- Update opportunities table to track time in stage
ALTER TABLE public.opportunities
ADD COLUMN IF NOT EXISTS stage_entered_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS follow_up_date date;

-- Function to update last_interaction on clients
CREATE OR REPLACE FUNCTION public.update_client_last_interaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.clients
  SET last_interaction_at = now()
  WHERE id = NEW.client_id;
  RETURN NEW;
END;
$$;

-- Trigger to update client last_interaction when opportunity changes
CREATE TRIGGER update_client_interaction_on_opportunity
AFTER INSERT OR UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_client_last_interaction();

-- Function to auto-create sale when opportunity is closed
CREATE OR REPLACE FUNCTION public.handle_opportunity_closed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  client_record RECORD;
BEGIN
  -- Only trigger when moving to 'closed' stage
  IF NEW.stage = 'closed' AND (OLD.stage IS NULL OR OLD.stage != 'closed') THEN
    -- Get client info
    SELECT * INTO client_record FROM public.clients WHERE id = NEW.client_id;
    
    -- Create sale record
    INSERT INTO public.sales (user_id, client_id, client_name, destination, sale_amount, opportunity_id, sale_date)
    VALUES (
      NEW.user_id,
      NEW.client_id,
      COALESCE(client_record.name, 'Cliente'),
      NEW.destination,
      NEW.estimated_value,
      NEW.id,
      CURRENT_DATE
    );
    
    -- Update client status to active
    UPDATE public.clients
    SET status = 'cliente_ativo', updated_at = now()
    WHERE id = NEW.client_id AND status IN ('lead', 'em_negociacao');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger for auto-creating sale on close
CREATE TRIGGER auto_create_sale_on_close
AFTER UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.handle_opportunity_closed();

-- Function to update stage_entered_at when stage changes
CREATE OR REPLACE FUNCTION public.update_stage_entered_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.stage IS DISTINCT FROM NEW.stage THEN
    NEW.stage_entered_at = now();
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger for stage_entered_at
CREATE TRIGGER update_opportunity_stage_time
BEFORE UPDATE ON public.opportunities
FOR EACH ROW
EXECUTE FUNCTION public.update_stage_entered_at();
