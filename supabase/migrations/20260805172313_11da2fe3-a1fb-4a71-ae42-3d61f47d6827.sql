-- 1) Remove ampla policy pública e o grant de leitura direta para anon
DROP POLICY IF EXISTS "Public can view sections of published quotes with valid token" ON public.quote_sections;
REVOKE SELECT ON public.quote_sections FROM anon;

-- 2) RPC SECURITY DEFINER para o fluxo legado por share_token
CREATE OR REPLACE FUNCTION public.get_quote_sections_by_share_token(p_share_token text)
RETURNS TABLE (id uuid, quote_id uuid, title text, order_index integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.quote_id, s.title, s.order_index
  FROM public.quote_sections s
  JOIN public.quotes q ON q.id = s.quote_id
  WHERE p_share_token IS NOT NULL
    AND length(p_share_token) >= 32
    AND q.share_token = p_share_token
    AND q.status = 'published'
    AND (q.share_expires_at IS NULL OR q.share_expires_at > now())
  ORDER BY s.order_index ASC;
$$;

REVOKE ALL ON FUNCTION public.get_quote_sections_by_share_token(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_quote_sections_by_share_token(text) TO anon, authenticated, service_role;