
-- ============================================================
-- P1 — Constraints de enums, range, validações e triggers
-- ============================================================

-- ---------- 1. CHECK constraints para enums textuais ----------

-- expense_entries.category
ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_category_check
  CHECK (category IN (
    'sistema','marketing','internet','aluguel','salarios','comissao',
    'administrativo','financeiro','comercial','relacionamento',
    'operacional','capacitacao','transporte','taxas','outros',
    -- legados
    'fornecedor','cafe_reuniao','presente_fornecedor'
  )) NOT VALID;

-- expense_entries.expense_type
ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_expense_type_check
  CHECK (expense_type IN ('fixed','variable')) NOT VALID;

-- expense_entries.recurrence_end_type
ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_recurrence_end_type_check
  CHECK (recurrence_end_type IN ('indefinite','until_date','occurrences')) NOT VALID;

-- sale_products.product_type
ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_product_type_check
  CHECK (product_type IN (
    'aereo','hotel','seguro','cruzeiro','transfer','atracao','locacao','outro'
  )) NOT VALID;

-- sale_products.commission_type
ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_commission_type_check
  CHECK (commission_type IN ('percentage','fixed')) NOT VALID;

-- sale_products.commission_status
ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_commission_status_check
  CHECK (commission_status IN ('previsao_criada','recebido','cancelado')) NOT VALID;

-- sale_products.payment_rule
ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_payment_rule_check
  CHECK (payment_rule IN (
    'after_sale','after_travel','after_invoice_issued','after_invoice_sent'
  )) NOT VALID;

-- payment_method (lista permissiva cobrindo valores atuais e comuns)
DO $$
DECLARE
  allowed text := 'pix,cartao,credito,debito,boleto,dinheiro,transferencia,cheque,outro';
BEGIN
  EXECUTE 'ALTER TABLE public.customer_payments
    ADD CONSTRAINT customer_payments_payment_method_check
    CHECK (payment_method IN (''' || replace(allowed, ',', ''',''') || ''')) NOT VALID';

  EXECUTE 'ALTER TABLE public.supplier_payments
    ADD CONSTRAINT supplier_payments_payment_method_check
    CHECK (payment_method IN (''' || replace(allowed, ',', ''',''') || ''')) NOT VALID';

  EXECUTE 'ALTER TABLE public.income_entries
    ADD CONSTRAINT income_entries_payment_method_check
    CHECK (payment_method IN (''' || replace(allowed, ',', ''',''') || ''')) NOT VALID';

  EXECUTE 'ALTER TABLE public.invoice_payments
    ADD CONSTRAINT invoice_payments_method_check
    CHECK (method IN (''' || replace(allowed, ',', ''',''') || ''')) NOT VALID';
END $$;

-- ---------- 2. Range de comissão do vendedor ----------
ALTER TABLE public.sellers
  ADD CONSTRAINT sellers_default_commission_percent_range
  CHECK (default_commission_percent IS NULL
         OR (default_commission_percent >= 0 AND default_commission_percent <= 100))
  NOT VALID;

-- ---------- 3. Validações de recorrência ----------
ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_recurrence_valid
  CHECK (
    -- variável não pode ser recorrente
    NOT (expense_type = 'variable' AND is_recurring = true)
    -- "ocorrências" requer número positivo
    AND (recurrence_end_type <> 'occurrences'
         OR (recurrence_occurrences IS NOT NULL AND recurrence_occurrences > 0))
    -- "até data" requer data informada
    AND (recurrence_end_type <> 'until_date' OR recurrence_end_date IS NOT NULL)
  ) NOT VALID;

-- ---------- 4. Trigger: sales.sale_amount = SUM(sale_products.sale_price) ----------
CREATE OR REPLACE FUNCTION public.recalc_sale_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sale_id uuid;
  v_total numeric;
BEGIN
  v_sale_id := COALESCE(NEW.sale_id, OLD.sale_id);
  IF v_sale_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  SELECT COALESCE(SUM(sale_price), 0)
    INTO v_total
    FROM public.sale_products
   WHERE sale_id = v_sale_id;

  UPDATE public.sales
     SET sale_amount = v_total,
         updated_at = now()
   WHERE id = v_sale_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_sale_amount ON public.sale_products;
CREATE TRIGGER trg_recalc_sale_amount
AFTER INSERT OR UPDATE OF sale_price, sale_id OR DELETE
ON public.sale_products
FOR EACH ROW
EXECUTE FUNCTION public.recalc_sale_amount();

-- ---------- 5. Trigger: totais de invoice (subtotal/taxes/total/paid/balance) ----------
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invoice_id uuid;
  v_subtotal numeric;
  v_taxes numeric;
  v_discount numeric;
  v_commission numeric;
  v_rav numeric;
  v_total numeric;
  v_paid numeric;
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
         updated_at = now()
   WHERE id = v_invoice_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_services ON public.invoice_services;
CREATE TRIGGER trg_recalc_invoice_totals_services
AFTER INSERT OR UPDATE OR DELETE
ON public.invoice_services
FOR EACH ROW
EXECUTE FUNCTION public.recalc_invoice_totals();

DROP TRIGGER IF EXISTS trg_recalc_invoice_totals_payments ON public.invoice_payments;
CREATE TRIGGER trg_recalc_invoice_totals_payments
AFTER INSERT OR UPDATE OR DELETE
ON public.invoice_payments
FOR EACH ROW
EXECUTE FUNCTION public.recalc_invoice_totals();
