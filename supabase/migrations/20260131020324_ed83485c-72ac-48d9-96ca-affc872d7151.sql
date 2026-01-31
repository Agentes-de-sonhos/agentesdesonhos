-- Create enum for subscription plans
CREATE TYPE public.subscription_plan AS ENUM ('essencial', 'profissional', 'premium');

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  plan subscription_plan NOT NULL DEFAULT 'essencial',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  ai_usage_count INTEGER NOT NULL DEFAULT 0,
  ai_usage_reset_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT date_trunc('month', now()) + interval '1 month',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own subscription"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscription"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own subscription"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can manage all subscriptions"
  ON public.subscriptions FOR ALL
  USING (has_role(auth.uid(), 'admin'));

-- Create index for performance
CREATE INDEX idx_subscriptions_user_id ON public.subscriptions(user_id);

-- Function to get user's current plan
CREATE OR REPLACE FUNCTION public.get_user_plan(_user_id UUID)
RETURNS subscription_plan
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT plan FROM public.subscriptions 
     WHERE user_id = _user_id 
     AND is_active = true 
     AND (expires_at IS NULL OR expires_at > now())
     LIMIT 1),
    'essencial'::subscription_plan
  )
$$;

-- Function to check if user has access to a feature
CREATE OR REPLACE FUNCTION public.has_feature_access(_user_id UUID, _feature TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_plan subscription_plan;
BEGIN
  user_plan := get_user_plan(_user_id);
  
  -- Essencial features
  IF _feature IN ('news', 'tourism_map', 'materials', 'agenda', 'crm_basic', 'trainings_recorded') THEN
    RETURN true;
  END IF;
  
  -- Profissional features
  IF _feature IN ('ai_tools', 'quote_generator', 'trip_wallet', 'reminders', 'financial', 'trainings_live') THEN
    RETURN user_plan IN ('profissional', 'premium');
  END IF;
  
  -- Premium features
  IF _feature IN ('ai_unlimited', 'trails_premium', 'certificates', 'ranking', 'premium_group', 'fam_tours') THEN
    RETURN user_plan = 'premium';
  END IF;
  
  RETURN false;
END;
$$;

-- Function to check and increment AI usage
CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_sub RECORD;
  monthly_limit INTEGER;
BEGIN
  SELECT * INTO user_sub FROM public.subscriptions 
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
  
  IF user_sub IS NULL THEN
    RETURN false;
  END IF;
  
  -- Reset counter if new month
  IF user_sub.ai_usage_reset_at <= now() THEN
    UPDATE public.subscriptions 
    SET ai_usage_count = 0,
        ai_usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_sub.id;
    user_sub.ai_usage_count := 0;
  END IF;
  
  -- Check limits based on plan
  CASE user_sub.plan
    WHEN 'essencial' THEN monthly_limit := 0;
    WHEN 'profissional' THEN monthly_limit := 20;
    WHEN 'premium' THEN monthly_limit := 1000; -- effectively unlimited
    ELSE monthly_limit := 0;
  END CASE;
  
  IF user_sub.ai_usage_count >= monthly_limit THEN
    RETURN false;
  END IF;
  
  -- Increment usage
  UPDATE public.subscriptions 
  SET ai_usage_count = ai_usage_count + 1
  WHERE id = user_sub.id;
  
  RETURN true;
END;
$$;

-- Trigger to auto-create subscription for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, 'essencial');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_subscription
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_subscription();