REVOKE ALL ON TABLE public.quote_booking_requests FROM anon;
REVOKE ALL ON TABLE public.quote_booking_request_items FROM anon;
REVOKE ALL ON TABLE public.quote_booking_request_events FROM anon;

REVOKE ALL ON TABLE public.quote_booking_requests FROM authenticated;
REVOKE ALL ON TABLE public.quote_booking_request_items FROM authenticated;
REVOKE ALL ON TABLE public.quote_booking_request_events FROM authenticated;

GRANT SELECT ON public.quote_booking_requests TO authenticated;
GRANT SELECT ON public.quote_booking_request_events TO authenticated;
GRANT SELECT, UPDATE ON public.quote_booking_request_items TO authenticated;