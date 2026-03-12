
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  target_plan subscription_plan;
BEGIN
  -- Check if signup metadata specifies a target plan
  target_plan := COALESCE(
    (NEW.raw_user_meta_data->>'target_plan')::subscription_plan,
    'essencial'::subscription_plan
  );
  
  INSERT INTO public.subscriptions (user_id, plan)
  VALUES (NEW.id, target_plan);
  RETURN NEW;
END;
$function$;
