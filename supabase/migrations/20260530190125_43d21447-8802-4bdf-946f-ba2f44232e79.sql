CREATE OR REPLACE FUNCTION public.protect_invoice_mirror_payments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Permitir quando a operação foi disparada por outro trigger (ex.: cascata
  -- de exclusão de fatura via sync_invoice_payment_to_cashflow).
  IF pg_trigger_depth() > 1 THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  IF auth.uid() IS NOT NULL THEN
    IF TG_OP = 'DELETE' AND OLD.source = 'invoice' THEN
      RAISE EXCEPTION 'Pagamento originado de fatura. Edite ou exclua pela tela de Faturas.'
        USING ERRCODE = 'check_violation';
    END IF;
    IF TG_OP = 'UPDATE' AND OLD.source = 'invoice' THEN
      RAISE EXCEPTION 'Pagamento originado de fatura. Edite ou exclua pela tela de Faturas.'
        USING ERRCODE = 'check_violation';
    END IF;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;