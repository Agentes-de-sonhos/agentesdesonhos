ALTER TABLE public.income_entries
  ADD COLUMN IF NOT EXISTS received_amount numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS received_date date;

-- Normaliza eventuais duplicatas antes do índice único
WITH ranked AS (
  SELECT id, row_number() OVER (PARTITION BY sale_product_id ORDER BY created_at ASC, id ASC) AS rn
  FROM public.income_entries
  WHERE sale_product_id IS NOT NULL AND COALESCE(source, 'manual') = 'auto'
)
DELETE FROM public.income_entries e
USING ranked r
WHERE e.id = r.id AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS income_entries_auto_sale_product_uniq
  ON public.income_entries (sale_product_id)
  WHERE sale_product_id IS NOT NULL AND source = 'auto';

CREATE OR REPLACE FUNCTION public.sync_auto_income_entry_for_product(p_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  p public.sale_products;
  v_amount numeric;
  v_received numeric;
  v_status text;
  v_entry_date date;
  v_received_date date;
  v_notes text;
BEGIN
  SELECT * INTO p FROM public.sale_products WHERE id = p_product_id;
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_amount := round(COALESCE(public.fn_calc_commission_amount(
    p.sale_price, p.non_commissionable_taxes, p.commission_type, p.commission_value
  ), 0)::numeric, 2);

  IF v_amount <= 0 THEN
    DELETE FROM public.income_entries
     WHERE sale_product_id = p.id AND COALESCE(source, 'manual') = 'auto';
    RETURN;
  END IF;

  v_received := LEAST(GREATEST(COALESCE(p.received_amount, 0), 0), v_amount);

  IF p.commission_status = 'cancelado' THEN
    v_status := 'cancelled';
    v_received := 0;
  ELSIF v_received >= v_amount THEN
    v_status := 'received';
  ELSIF v_received > 0 THEN
    v_status := 'partial';
  ELSE
    v_status := 'pending';
  END IF;

  IF v_status IN ('received', 'partial') THEN
    v_received_date := COALESCE(p.received_date, CURRENT_DATE);
  ELSE
    v_received_date := NULL;
  END IF;

  v_entry_date := COALESCE(v_received_date, p.expected_date, CURRENT_DATE);
  v_notes := 'Comissão: ' || COALESCE(NULLIF(p.supplier_name, ''), p.product_type);

  UPDATE public.income_entries
     SET amount = v_amount,
         received_amount = v_received,
         received_date = v_received_date,
         status = v_status,
         entry_date = v_entry_date,
         expected_date = CASE WHEN p.expected_date IS NULL THEN NULL ELSE p.expected_date::text END,
         sale_id = p.sale_id,
         user_id = p.user_id,
         notes = COALESCE(NULLIF(notes, ''), v_notes),
         updated_at = now()
   WHERE sale_product_id = p.id
     AND COALESCE(source, 'manual') = 'auto';

  IF NOT FOUND THEN
    INSERT INTO public.income_entries (
      user_id, sale_id, sale_product_id, amount, received_amount, received_date,
      entry_date, expected_date, payment_method, status, source, notes
    ) VALUES (
      p.user_id, p.sale_id, p.id, v_amount, v_received, v_received_date,
      v_entry_date, CASE WHEN p.expected_date IS NULL THEN NULL ELSE p.expected_date::text END,
      'pix', v_status, 'auto', v_notes
    );
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.trg_sync_auto_income_entry()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.sync_auto_income_entry_for_product(NEW.id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sale_products_sync_auto_income ON public.sale_products;
CREATE TRIGGER sale_products_sync_auto_income
AFTER INSERT OR UPDATE OF sale_price, non_commissionable_taxes, commission_type,
  commission_value, commission_status, received_amount, received_date,
  expected_date, supplier_name, product_type, sale_id
ON public.sale_products
FOR EACH ROW
EXECUTE FUNCTION public.trg_sync_auto_income_entry();

-- Backfill idempotente dos registros legados
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT id FROM public.sale_products LOOP
    PERFORM public.sync_auto_income_entry_for_product(r.id);
  END LOOP;
END $$;