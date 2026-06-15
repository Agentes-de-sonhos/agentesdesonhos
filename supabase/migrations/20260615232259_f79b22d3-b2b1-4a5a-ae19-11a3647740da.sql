-- Drop overly-permissive anonymous policies
DROP POLICY IF EXISTS "Public can view invoices via access code" ON public.invoices;
DROP POLICY IF EXISTS "Public can view services via invoice access code" ON public.invoice_services;
DROP POLICY IF EXISTS "Public can view installments via invoice access code" ON public.invoice_installments;
DROP POLICY IF EXISTS "Public can view payments via invoice access code" ON public.invoice_payments;

-- Revoke direct SELECT from anon role (RPC SECURITY DEFINER remains functional)
REVOKE SELECT ON public.invoices FROM anon;
REVOKE SELECT ON public.invoice_services FROM anon;
REVOKE SELECT ON public.invoice_installments FROM anon;
REVOKE SELECT ON public.invoice_payments FROM anon;