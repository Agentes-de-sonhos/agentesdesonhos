
-- Enums
DO $$ BEGIN
  CREATE TYPE public.invoice_status AS ENUM ('draft','sent','partial','paid','cancelled','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_source_type AS ENUM ('manual','quote','trip','opportunity','operation');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_service_category AS ENUM ('aereo','hotel','cruzeiro','seguro','passeio','transfer','ingresso','pacote','outros');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.invoice_installment_status AS ENUM ('pending','paid','overdue');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ===== INVOICES =====
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  invoice_number text NOT NULL,
  issue_date date NOT NULL DEFAULT CURRENT_DATE,
  due_date date,
  status public.invoice_status NOT NULL DEFAULT 'draft',
  source_type public.invoice_source_type NOT NULL DEFAULT 'manual',
  source_id uuid,

  client_id uuid,
  client_name text NOT NULL,
  client_company text,
  client_document text,
  client_email text,
  client_phone text,

  destination text,
  travel_start date,
  travel_end date,
  passengers jsonb DEFAULT '[]'::jsonb,

  subtotal numeric(14,2) NOT NULL DEFAULT 0,
  taxes_total numeric(14,2) NOT NULL DEFAULT 0,
  discount_total numeric(14,2) NOT NULL DEFAULT 0,
  commission_total numeric(14,2) NOT NULL DEFAULT 0,
  rav_total numeric(14,2) NOT NULL DEFAULT 0,
  total_amount numeric(14,2) NOT NULL DEFAULT 0,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  balance numeric(14,2) NOT NULL DEFAULT 0,
  estimated_profit numeric(14,2) NOT NULL DEFAULT 0,

  currency text NOT NULL DEFAULT 'BRL',
  notes text,
  terms text,

  pix_key text,
  pix_qr_payload text,

  public_access_code text UNIQUE,
  agency_slug text,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, invoice_number)
);

CREATE INDEX idx_invoices_user ON public.invoices(user_id);
CREATE INDEX idx_invoices_client ON public.invoices(client_id);
CREATE INDEX idx_invoices_status ON public.invoices(status);
CREATE INDEX idx_invoices_source ON public.invoices(source_type, source_id);

GRANT SELECT ON public.invoices TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoices TO authenticated;
GRANT ALL ON public.invoices TO service_role;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage invoices" ON public.invoices
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view invoices via access code"
  ON public.invoices FOR SELECT TO anon, authenticated
  USING (public_access_code IS NOT NULL);

CREATE TRIGGER tg_invoices_updated BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== INVOICE SERVICES =====
CREATE TABLE public.invoice_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  order_index int NOT NULL DEFAULT 0,
  category public.invoice_service_category NOT NULL DEFAULT 'outros',
  description text,
  fare numeric(14,2) NOT NULL DEFAULT 0,
  taxes numeric(14,2) NOT NULL DEFAULT 0,
  discount numeric(14,2) NOT NULL DEFAULT 0,
  commission numeric(14,2) NOT NULL DEFAULT 0,
  rav numeric(14,2) NOT NULL DEFAULT 0,
  net_amount numeric(14,2) NOT NULL DEFAULT 0,
  final_amount numeric(14,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_services_invoice ON public.invoice_services(invoice_id);

GRANT SELECT ON public.invoice_services TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_services TO authenticated;
GRANT ALL ON public.invoice_services TO service_role;

ALTER TABLE public.invoice_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage invoice services" ON public.invoice_services
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view services via invoice access code"
  ON public.invoice_services FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.public_access_code IS NOT NULL));

CREATE TRIGGER tg_invoice_services_updated BEFORE UPDATE ON public.invoice_services
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== INSTALLMENTS =====
CREATE TABLE public.invoice_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  installment_number int NOT NULL,
  label text,
  amount numeric(14,2) NOT NULL DEFAULT 0,
  due_date date,
  status public.invoice_installment_status NOT NULL DEFAULT 'pending',
  paid_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_installments_invoice ON public.invoice_installments(invoice_id);

GRANT SELECT ON public.invoice_installments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_installments TO authenticated;
GRANT ALL ON public.invoice_installments TO service_role;

ALTER TABLE public.invoice_installments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage invoice installments" ON public.invoice_installments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view installments via invoice access code"
  ON public.invoice_installments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.public_access_code IS NOT NULL));

CREATE TRIGGER tg_invoice_installments_updated BEFORE UPDATE ON public.invoice_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== PAYMENTS =====
CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  installment_id uuid REFERENCES public.invoice_installments(id) ON DELETE SET NULL,
  user_id uuid NOT NULL,
  amount numeric(14,2) NOT NULL,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  method text NOT NULL DEFAULT 'pix',
  notes text,
  receipt_number text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_invoice_payments_invoice ON public.invoice_payments(invoice_id);
CREATE INDEX idx_invoice_payments_installment ON public.invoice_payments(installment_id);

GRANT SELECT ON public.invoice_payments TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.invoice_payments TO authenticated;
GRANT ALL ON public.invoice_payments TO service_role;

ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage invoice payments" ON public.invoice_payments
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Public can view payments via invoice access code"
  ON public.invoice_payments FOR SELECT TO anon, authenticated
  USING (EXISTS (SELECT 1 FROM public.invoices i WHERE i.id = invoice_id AND i.public_access_code IS NOT NULL));

CREATE TRIGGER tg_invoice_payments_updated BEFORE UPDATE ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ===== NUMBER GENERATORS =====
CREATE OR REPLACE FUNCTION public.generate_invoice_number(_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr text := EXTRACT(YEAR FROM now())::text;
  seq int;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM public.invoices
   WHERE user_id = _user_id AND EXTRACT(YEAR FROM created_at)::text = yr;
  RETURN 'FAT-' || yr || '-' || lpad(seq::text, 6, '0');
END $$;

CREATE OR REPLACE FUNCTION public.generate_receipt_number(_user_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  yr text := EXTRACT(YEAR FROM now())::text;
  seq int;
BEGIN
  SELECT COUNT(*) + 1 INTO seq FROM public.invoice_payments
   WHERE user_id = _user_id AND EXTRACT(YEAR FROM created_at)::text = yr;
  RETURN 'REC-' || yr || '-' || lpad(seq::text, 6, '0');
END $$;

CREATE OR REPLACE FUNCTION public.generate_invoice_access_code()
RETURNS text LANGUAGE plpgsql SET search_path = public AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := ''; i int;
BEGIN
  LOOP
    result := '';
    FOR i IN 1..20 LOOP
      result := result || substr(chars, floor(random()*length(chars)+1)::int, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.invoices WHERE public_access_code = result);
  END LOOP;
  RETURN result;
END $$;

-- Auto-fill invoice number + access code + agency slug
CREATE OR REPLACE FUNCTION public.before_insert_invoice()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := public.generate_invoice_number(NEW.user_id);
  END IF;
  IF NEW.public_access_code IS NULL THEN
    NEW.public_access_code := public.generate_invoice_access_code();
  END IF;
  IF NEW.agency_slug IS NULL THEN
    NEW.agency_slug := public.get_agency_slug_for_user(NEW.user_id);
  END IF;
  NEW.balance := NEW.total_amount - COALESCE(NEW.paid_amount, 0);
  RETURN NEW;
END $$;

CREATE TRIGGER tg_before_insert_invoice BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.before_insert_invoice();

-- Auto-fill receipt number on payment insert
CREATE OR REPLACE FUNCTION public.before_insert_invoice_payment()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.receipt_number IS NULL OR NEW.receipt_number = '' THEN
    NEW.receipt_number := public.generate_receipt_number(NEW.user_id);
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER tg_before_insert_invoice_payment BEFORE INSERT ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.before_insert_invoice_payment();

-- Recalculate invoice totals from payments
CREATE OR REPLACE FUNCTION public.recalc_invoice_totals()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_invoice_id uuid;
  v_paid numeric;
  v_total numeric;
  v_due date;
  v_new_status public.invoice_status;
  v_current_status public.invoice_status;
BEGIN
  v_invoice_id := COALESCE(NEW.invoice_id, OLD.invoice_id);

  SELECT total_amount, due_date, status INTO v_total, v_due, v_current_status
    FROM public.invoices WHERE id = v_invoice_id;

  SELECT COALESCE(SUM(amount), 0) INTO v_paid
    FROM public.invoice_payments WHERE invoice_id = v_invoice_id;

  IF v_current_status = 'cancelled' THEN
    v_new_status := 'cancelled';
  ELSIF v_paid >= v_total AND v_total > 0 THEN
    v_new_status := 'paid';
  ELSIF v_paid > 0 THEN
    v_new_status := 'partial';
  ELSIF v_due IS NOT NULL AND v_due < CURRENT_DATE THEN
    v_new_status := 'overdue';
  ELSE
    v_new_status := COALESCE(v_current_status, 'draft');
    IF v_new_status = 'paid' OR v_new_status = 'partial' OR v_new_status = 'overdue' THEN
      v_new_status := 'sent';
    END IF;
  END IF;

  UPDATE public.invoices
     SET paid_amount = v_paid,
         balance = GREATEST(v_total - v_paid, 0),
         status = v_new_status,
         updated_at = now()
   WHERE id = v_invoice_id;

  -- Mark installment as paid if linked and fully covered
  IF TG_OP IN ('INSERT','UPDATE') AND NEW.installment_id IS NOT NULL THEN
    UPDATE public.invoice_installments
       SET status = 'paid', paid_at = COALESCE(paid_at, now())
     WHERE id = NEW.installment_id
       AND amount <= COALESCE((SELECT SUM(amount) FROM public.invoice_payments WHERE installment_id = NEW.installment_id), 0);
  END IF;

  RETURN COALESCE(NEW, OLD);
END $$;

CREATE TRIGGER tg_recalc_invoice_totals
AFTER INSERT OR UPDATE OR DELETE ON public.invoice_payments
FOR EACH ROW EXECUTE FUNCTION public.recalc_invoice_totals();

-- ===== Public RPC =====
CREATE OR REPLACE FUNCTION public.get_invoice_by_public_code(p_agency_slug text, p_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  inv RECORD; agent RECORD;
  services_data json; installments_data json; payments_data json; agent_profile json;
  slug_check text;
BEGIN
  IF p_code IS NULL OR length(p_code) < 12 THEN
    RETURN json_build_object('error','Link inválido');
  END IF;

  SELECT * INTO inv FROM public.invoices WHERE public_access_code = p_code;
  IF inv IS NULL OR inv.status = 'draft' THEN
    RETURN json_build_object('error','Fatura não encontrada');
  END IF;

  SELECT * INTO agent FROM public.profiles WHERE user_id = inv.user_id;
  IF agent IS NULL THEN
    RETURN json_build_object('error','Fatura não encontrada');
  END IF;

  slug_check := lower(public.unaccent(COALESCE(agent.agency_name,'')));
  slug_check := regexp_replace(slug_check, '[^a-z0-9\-]', '-', 'g');
  slug_check := regexp_replace(slug_check, '-+', '-', 'g');
  slug_check := trim(both '-' from slug_check);

  IF slug_check <> p_agency_slug THEN
    RETURN json_build_object('error','Fatura não encontrada');
  END IF;

  SELECT json_agg(row_to_json(s) ORDER BY s.order_index) INTO services_data
    FROM public.invoice_services s WHERE s.invoice_id = inv.id;
  SELECT json_agg(row_to_json(i) ORDER BY i.installment_number) INTO installments_data
    FROM public.invoice_installments i WHERE i.invoice_id = inv.id;
  SELECT json_agg(row_to_json(p) ORDER BY p.payment_date) INTO payments_data
    FROM public.invoice_payments p WHERE p.invoice_id = inv.id;

  agent_profile := json_build_object(
    'name', agent.name, 'phone', agent.phone, 'avatar_url', agent.avatar_url,
    'agency_name', agent.agency_name, 'agency_logo_url', agent.agency_logo_url,
    'city', agent.city, 'state', agent.state
  );

  RETURN json_build_object(
    'invoice', row_to_json(inv),
    'services', COALESCE(services_data, '[]'::json),
    'installments', COALESCE(installments_data, '[]'::json),
    'payments', COALESCE(payments_data, '[]'::json),
    'agent_profile', agent_profile
  );
END $$;
