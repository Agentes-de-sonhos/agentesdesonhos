
-- 1) Add received_amount for partial commission receipts
ALTER TABLE public.sale_products
  ADD COLUMN IF NOT EXISTS received_amount numeric NOT NULL DEFAULT 0;

-- 2) Relax/expand commission_status check to cover all statuses used by the app
ALTER TABLE public.sale_products
  DROP CONSTRAINT IF EXISTS sale_products_commission_status_check;

ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_commission_status_check
  CHECK (commission_status = ANY (ARRAY[
    'previsao_criada'::text,
    'aguardando_emissao_nota'::text,
    'aguardando_envio_nota'::text,
    'aguardando_pagamento'::text,
    'recebido_parcial'::text,
    'recebido'::text,
    'cancelado'::text
  ])) NOT VALID;

-- 3) Centralized commission_amount calculator
CREATE OR REPLACE FUNCTION public.fn_calc_commission_amount(
  p_sale_price numeric,
  p_taxes numeric,
  p_type text,
  p_value numeric
) RETURNS numeric
LANGUAGE sql IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_type = 'percentage'
      THEN GREATEST(COALESCE(p_sale_price,0) - COALESCE(p_taxes,0), 0) * COALESCE(p_value,0) / 100.0
    ELSE COALESCE(p_value,0)
  END
$$;

-- 4) Centralized commission_status derivation (skips when cancelado)
CREATE OR REPLACE FUNCTION public.fn_compute_commission_status(
  p_requires_invoice boolean,
  p_invoice_status text,
  p_received_amount numeric,
  p_commission_amount numeric,
  p_current_status text
) RETURNS text
LANGUAGE plpgsql IMMUTABLE
AS $$
DECLARE
  received numeric := COALESCE(p_received_amount, 0);
  expected numeric := COALESCE(p_commission_amount, 0);
BEGIN
  IF p_current_status = 'cancelado' THEN
    RETURN 'cancelado';
  END IF;

  IF expected > 0 AND received >= expected THEN
    RETURN 'recebido';
  ELSIF received > 0 THEN
    RETURN 'recebido_parcial';
  END IF;

  IF COALESCE(p_requires_invoice, false) THEN
    IF COALESCE(p_invoice_status, 'a_emitir') = 'a_emitir' THEN
      RETURN 'aguardando_emissao_nota';
    ELSIF p_invoice_status = 'emitida' THEN
      RETURN 'aguardando_envio_nota';
    ELSE
      -- 'enviada' or 'dispensada'
      RETURN 'aguardando_pagamento';
    END IF;
  END IF;

  RETURN 'aguardando_pagamento';
END;
$$;

-- 5) BEFORE trigger on sale_products: keep commission_status consistent
CREATE OR REPLACE FUNCTION public.trg_sync_commission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric;
  v_current text;
BEGIN
  v_amount := public.fn_calc_commission_amount(
    NEW.sale_price, NEW.non_commissionable_taxes, NEW.commission_type, NEW.commission_value
  );

  -- Detect explicit cancel transition from caller
  v_current := COALESCE(NEW.commission_status, 'previsao_criada');

  NEW.commission_status := public.fn_compute_commission_status(
    NEW.requires_invoice,
    NEW.invoice_status,
    NEW.received_amount,
    v_amount,
    v_current
  );

  -- Auto-fill received_date when fully received
  IF NEW.commission_status = 'recebido' AND NEW.received_date IS NULL THEN
    NEW.received_date := CURRENT_DATE;
  END IF;

  -- Clear received_date when no longer received
  IF NEW.commission_status <> 'recebido' AND NEW.received_amount = 0 THEN
    NEW.received_date := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sale_products_sync_status ON public.sale_products;
CREATE TRIGGER sale_products_sync_status
  BEFORE INSERT OR UPDATE OF sale_price, non_commissionable_taxes, commission_type,
    commission_value, requires_invoice, invoice_status, received_amount,
    commission_status
  ON public.sale_products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_commission_status();

-- 6) AFTER trigger: keep sales.sale_amount = SUM(sale_products.sale_price)
CREATE OR REPLACE FUNCTION public.trg_sync_sale_amount()
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

  SELECT COALESCE(SUM(sale_price), 0) INTO v_total
  FROM public.sale_products
  WHERE sale_id = v_sale_id;

  UPDATE public.sales
  SET sale_amount = v_total,
      updated_at = now()
  WHERE id = v_sale_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS sale_products_sync_sale_amount ON public.sale_products;
CREATE TRIGGER sale_products_sync_sale_amount
  AFTER INSERT OR UPDATE OF sale_price OR DELETE
  ON public.sale_products
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_sync_sale_amount();

-- 7) Backfill: normalize existing rows (recompute commission_status + sale_amount totals)
UPDATE public.sale_products SET id = id;  -- touch BEFORE trigger to recompute status
UPDATE public.sales s
SET sale_amount = sub.total
FROM (
  SELECT sale_id, COALESCE(SUM(sale_price),0) AS total
  FROM public.sale_products
  GROUP BY sale_id
) sub
WHERE s.id = sub.sale_id
  AND s.sale_amount <> sub.total;
