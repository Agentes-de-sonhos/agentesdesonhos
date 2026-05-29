
-- 1) Atualiza a função de recálculo para também ajustar o status
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_invoice_id uuid;
  v_subtotal numeric;
  v_taxes numeric;
  v_discount numeric;
  v_commission numeric;
  v_rav numeric;
  v_total numeric;
  v_paid numeric;
  v_current_status invoice_status;
  v_due_date date;
  v_new_status invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_invoice_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT
    COALESCE(SUM(fare), 0),
    COALESCE(SUM(taxes), 0),
    COALESCE(SUM(discount), 0),
    COALESCE(SUM(commission), 0),
    COALESCE(SUM(rav), 0),
    COALESCE(SUM(final_amount), 0)
  INTO v_subtotal, v_taxes, v_discount, v_commission, v_rav, v_total
  FROM public.invoice_services
  WHERE invoice_id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0)
    INTO v_paid
    FROM public.invoice_payments
   WHERE invoice_id = v_invoice_id;

  SELECT status, due_date
    INTO v_current_status, v_due_date
    FROM public.invoices
   WHERE id = v_invoice_id;

  -- Resolve novo status com base nas regras
  IF v_current_status = 'cancelled' THEN
    v_new_status := 'cancelled';
  ELSIF v_total > 0 AND v_paid >= v_total THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 AND v_paid < v_total THEN
    v_new_status := 'partial';
  ELSIF v_paid = 0 THEN
    IF v_current_status = 'draft' THEN
      v_new_status := 'draft';
    ELSIF v_due_date IS NOT NULL AND v_due_date < CURRENT_DATE THEN
      v_new_status := 'overdue';
    ELSE
      v_new_status := v_current_status;
    END IF;
  ELSE
    v_new_status := v_current_status;
  END IF;

  UPDATE public.invoices
     SET subtotal = v_subtotal,
         taxes_total = v_taxes,
         discount_total = v_discount,
         commission_total = v_commission,
         rav_total = v_rav,
         total_amount = v_total,
         paid_amount = v_paid,
         balance = v_total - v_paid,
         estimated_profit = v_commission + v_rav,
         status = v_new_status,
         updated_at = now()
   WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

-- 2) Remover trigger duplicado em invoice_payments
DROP TRIGGER IF EXISTS tg_recalc_invoice_totals ON public.invoice_payments;
