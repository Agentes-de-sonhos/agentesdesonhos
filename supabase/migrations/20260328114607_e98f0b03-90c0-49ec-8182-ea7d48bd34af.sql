
-- Remove the permissive UPDATE policy that lets users change their own plan
DROP POLICY "Users can update their own subscription" ON public.subscriptions;

-- Create a restricted UPDATE policy: users can only update non-sensitive fields
-- (ai_usage_count and ai_usage_reset_at are handled by check_ai_usage SECURITY DEFINER function)
-- Users should NOT be able to update: plan, is_active, expires_at, stripe fields
-- In practice, there are no safe fields for users to update directly, so no user UPDATE policy is needed.
-- All subscription changes go through: webhooks (service_role), admin, or check_ai_usage function.

-- Also remove the INSERT policy - subscriptions are created by the handle_new_user_subscription trigger
DROP POLICY "Users can insert their own subscription" ON public.subscriptions;
