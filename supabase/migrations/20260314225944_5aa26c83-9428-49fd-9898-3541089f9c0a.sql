
-- Fix policies that already exist by dropping first
DROP POLICY IF EXISTS "Admins can manage all roles" ON public.user_roles;
CREATE POLICY "Admins can manage all roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can view own role" ON public.user_roles;
CREATE POLICY "Users can view own role"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Public can view trips by slug" ON public.trips;

DROP POLICY IF EXISTS "Anyone can view trail speakers" ON public.trail_speakers;
DROP POLICY IF EXISTS "Authenticated users can view trail speakers" ON public.trail_speakers;
CREATE POLICY "Authenticated users can view trail speakers"
ON public.trail_speakers
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Anyone can update own response" ON public.survey_responses;
DROP POLICY IF EXISTS "Authenticated users can update responses" ON public.survey_responses;
CREATE POLICY "Authenticated users can update responses"
ON public.survey_responses
FOR UPDATE
TO authenticated
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can manage preset events" ON public.preset_events;
CREATE POLICY "Admins can manage preset events"
ON public.preset_events
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.check_ai_usage(_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  user_sub RECORD;
  monthly_limit INTEGER;
BEGIN
  IF _user_id != auth.uid() THEN
    RAISE EXCEPTION 'Unauthorized: Cannot modify other users AI usage';
  END IF;

  SELECT * INTO user_sub FROM public.subscriptions 
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
  
  IF user_sub IS NULL THEN
    RETURN false;
  END IF;
  
  IF user_sub.ai_usage_reset_at <= now() THEN
    UPDATE public.subscriptions 
    SET ai_usage_count = 0,
        ai_usage_reset_at = date_trunc('month', now()) + interval '1 month'
    WHERE id = user_sub.id;
    user_sub.ai_usage_count := 0;
  END IF;
  
  CASE user_sub.plan
    WHEN 'essencial' THEN monthly_limit := 0;
    WHEN 'profissional' THEN monthly_limit := 20;
    WHEN 'premium' THEN monthly_limit := 1000;
    ELSE monthly_limit := 0;
  END CASE;
  
  IF user_sub.ai_usage_count >= monthly_limit THEN
    RETURN false;
  END IF;
  
  UPDATE public.subscriptions 
  SET ai_usage_count = ai_usage_count + 1
  WHERE id = user_sub.id;
  
  RETURN true;
END;
$$;
