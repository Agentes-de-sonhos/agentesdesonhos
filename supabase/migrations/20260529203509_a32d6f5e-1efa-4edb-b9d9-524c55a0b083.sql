
-- P2.1: Espelhar invoice_payments em customer_payments

ALTER TABLE public.customer_payments
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS source_id uuid;

ALTER TABLE public.customer_payments
  ALTER COLUMN sale_id DROP NOT NULL;

ALTER TABLE public.customer_payments
  DROP CONSTRAINT IF EXISTS customer_payments_source_check;
ALTER TABLE public.customer_payments
  ADD CONSTRAINT customer_payments_source_check
  CHECK (source IN ('manual','invoice'));

CREATE UNIQUE INDEX IF NOT EXISTS uq_customer_payments_source
  ON public.customer_payments (source, source_id)
  WHERE source <> 'manual';

CREATE OR REPLACE FUNCTION public.sync_invoice_payment_to_cashflow()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_inv_number text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.customer_payments
     WHERE source = 'invoice' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  SELECT invoice_number INTO v_inv_number
    FROM public.invoices WHERE id = NEW.invoice_id;

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.customer_payments (
      user_id, sale_id, amount, payment_date, payment_method,
      notes, source, source_id
    ) VALUES (
      NEW.user_id, NULL, NEW.amount, NEW.payment_date, NEW.method,
      'Fatura ' || COALESCE(v_inv_number, NEW.invoice_id::text) ||
        CASE WHEN NEW.notes IS NOT NULL AND NEW.notes <> '' THEN ' — ' || NEW.notes ELSE '' END,
      'invoice', NEW.id
    )
    ON CONFLICT (source, source_id) WHERE source <> 'manual' DO NOTHING;
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    UPDATE public.customer_payments
       SET amount = NEW.amount,
           payment_date = NEW.payment_date,
           payment_method = NEW.method,
           notes = 'Fatura ' || COALESCE(v_inv_number, NEW.invoice_id::text) ||
                   CASE WHEN NEW.notes IS NOT NULL AND NEW.notes <> '' THEN ' — ' || NEW.notes ELSE '' END,
           updated_at = now()
     WHERE source = 'invoice' AND source_id = NEW.id;

    IF NOT FOUND THEN
      INSERT INTO public.customer_payments (
        user_id, sale_id, amount, payment_date, payment_method,
        notes, source, source_id
      ) VALUES (
        NEW.user_id, NULL, NEW.amount, NEW.payment_date, NEW.method,
        'Fatura ' || COALESCE(v_inv_number, NEW.invoice_id::text),
        'invoice', NEW.id
      )
      ON CONFLICT (source, source_id) WHERE source <> 'manual' DO NOTHING;
    END IF;
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_invoice_payment_to_cashflow ON public.invoice_payments;
CREATE TRIGGER trg_sync_invoice_payment_to_cashflow
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.sync_invoice_payment_to_cashflow();

INSERT INTO public.customer_payments (
  user_id, sale_id, amount, payment_date, payment_method,
  notes, source, source_id, created_at, updated_at
)
SELECT
  ip.user_id, NULL, ip.amount, ip.payment_date, ip.method,
  'Fatura ' || COALESCE(i.invoice_number, ip.invoice_id::text) ||
    CASE WHEN ip.notes IS NOT NULL AND ip.notes <> '' THEN ' — ' || ip.notes ELSE '' END,
  'invoice', ip.id, ip.created_at, ip.updated_at
FROM public.invoice_payments ip
JOIN public.invoices i ON i.id = ip.invoice_id
ON CONFLICT (source, source_id) WHERE source <> 'manual' DO NOTHING;

CREATE OR REPLACE FUNCTION public.protect_invoice_mirror_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
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

DROP TRIGGER IF EXISTS trg_protect_invoice_mirror_payments ON public.customer_payments;
CREATE TRIGGER trg_protect_invoice_mirror_payments
BEFORE UPDATE OR DELETE ON public.customer_payments
FOR EACH ROW EXECUTE FUNCTION public.protect_invoice_mirror_payments();
