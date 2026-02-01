-- Create promoter monthly winners table to store historical winners
CREATE TABLE public.promoter_monthly_winners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
  year INTEGER NOT NULL CHECK (year >= 2020),
  ranking_criteria TEXT NOT NULL DEFAULT 'sales_count' CHECK (ranking_criteria IN ('sales_count', 'revenue')),
  total_sales_count INTEGER NOT NULL DEFAULT 0,
  total_revenue NUMERIC NOT NULL DEFAULT 0,
  prize_name TEXT,
  prize_description TEXT,
  prize_image_url TEXT,
  is_confirmed BOOLEAN NOT NULL DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  confirmed_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(month, year)
);

-- Create promoter settings table for admin configuration
CREATE TABLE public.promoter_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  ranking_criteria TEXT NOT NULL DEFAULT 'sales_count' CHECK (ranking_criteria IN ('sales_count', 'revenue')),
  current_month_prize_name TEXT,
  current_month_prize_description TEXT,
  current_month_prize_image_url TEXT,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_by UUID
);

-- Insert default settings
INSERT INTO public.promoter_settings (ranking_criteria) VALUES ('sales_count');

-- Enable RLS
ALTER TABLE public.promoter_monthly_winners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promoter_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for promoter_monthly_winners
CREATE POLICY "Anyone can view confirmed winners"
  ON public.promoter_monthly_winners
  FOR SELECT
  USING (is_confirmed = true);

CREATE POLICY "Admins can manage promoter winners"
  ON public.promoter_monthly_winners
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS Policies for promoter_settings
CREATE POLICY "Anyone can view promoter settings"
  ON public.promoter_settings
  FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage promoter settings"
  ON public.promoter_settings
  FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Create function to get monthly sales ranking
CREATE OR REPLACE FUNCTION public.get_monthly_sales_ranking(target_month INTEGER, target_year INTEGER)
RETURNS TABLE (
  user_id UUID,
  user_name TEXT,
  avatar_url TEXT,
  sales_count BIGINT,
  total_revenue NUMERIC
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.user_id,
    COALESCE(p.name, 'Usuário') as user_name,
    p.avatar_url,
    COUNT(s.id) as sales_count,
    COALESCE(SUM(s.sale_amount), 0) as total_revenue
  FROM sales s
  LEFT JOIN profiles p ON p.user_id = s.user_id
  WHERE EXTRACT(MONTH FROM s.sale_date) = target_month
    AND EXTRACT(YEAR FROM s.sale_date) = target_year
  GROUP BY s.user_id, p.name, p.avatar_url
  ORDER BY sales_count DESC, total_revenue DESC;
END;
$$;

-- Create trigger for updated_at
CREATE TRIGGER update_promoter_monthly_winners_updated_at
  BEFORE UPDATE ON public.promoter_monthly_winners
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_promoter_settings_updated_at
  BEFORE UPDATE ON public.promoter_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();