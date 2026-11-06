-- Run with a privileged test connection. Read-only; sends no notifications.
DO $$
BEGIN
  ASSERT public.booking_request_plan_eligible('fundador') = true, 'Fundador is eligible';
  ASSERT public.booking_request_plan_eligible('premium') = true, 'Premium remains eligible';
  ASSERT public.booking_request_plan_eligible('start') = false, 'Start remains excluded';
  ASSERT public.booking_request_plan_eligible('profissional') = false, 'Profissional remains excluded';
  ASSERT public.booking_request_plan_eligible(NULL) = false, 'Missing plan fails closed';
  ASSERT public.agency_can_use_booking_requests(NULL) = false, 'Missing agency fails closed';
END $$;