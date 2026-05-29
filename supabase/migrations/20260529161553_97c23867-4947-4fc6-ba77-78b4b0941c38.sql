
-- Auto-sync invoice payments to CRM/Operations
CREATE OR REPLACE FUNCTION public.sync_invoice_payment_to_crm()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice public.invoices%ROWTYPE;
  v_payment_date timestamptz;
BEGIN
  -- Pick the row from NEW (insert/update) or OLD (delete)
  SELECT * INTO v_invoice FROM public.invoices
   WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);

  IF v_invoice.id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  v_payment_date := COALESCE(NEW.payment_date, OLD.payment_date, CURRENT_DATE)::timestamptz;

  -- 1) Bump client last_interaction_at when adding a payment
  IF TG_OP IN ('INSERT','UPDATE') AND v_invoice.client_id IS NOT NULL THEN
    UPDATE public.clients
       SET last_interaction_at = GREATEST(COALESCE(last_interaction_at, v_payment_date), v_payment_date)
     WHERE id = v_invoice.client_id
       AND user_id = v_invoice.user_id;
  END IF;

  -- 2) When the invoice is fully paid, propagate to the linked Operation card
  IF v_invoice.status = 'paid' AND v_invoice.balance <= 0 THEN
    IF v_invoice.source_type = 'operation' AND v_invoice.source_id IS NOT NULL THEN
      UPDATE public.operations
         SET payment_status = 'pago', updated_at = now()
       WHERE id = v_invoice.source_id
         AND user_id = v_invoice.user_id;
    ELSIF v_invoice.source_type = 'quote' AND v_invoice.source_id IS NOT NULL THEN
      UPDATE public.operations
         SET payment_status = 'pago', updated_at = now()
       WHERE quote_id = v_invoice.source_id
         AND user_id = v_invoice.user_id;
    ELSIF v_invoice.source_type = 'opportunity' AND v_invoice.source_id IS NOT NULL THEN
      UPDATE public.operations
         SET payment_status = 'pago', updated_at = now()
       WHERE opportunity_id = v_invoice.source_id
         AND user_id = v_invoice.user_id;
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_payment_to_crm ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_payment_to_crm
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_to_crm();
