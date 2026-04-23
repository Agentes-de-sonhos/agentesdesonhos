UPDATE public.quotes
SET public_access_code = public.generate_quote_access_code()
WHERE public_access_code IS NULL;