
-- =============================================
-- MÓDULO FINANCEIRO & VENDAS (Bookings)
-- =============================================

-- 1. BOOKINGS (Vendas / Dossiês)
CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  trip_name text NOT NULL,
  start_date date,
  end_date date,
  status text NOT NULL DEFAULT 'lead',
  total_amount numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own bookings" ON public.bookings FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 2. BOOKING SERVICES (Serviços da Venda)
CREATE TABLE public.booking_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_type text NOT NULL,
  supplier_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  description text,
  sale_price numeric NOT NULL DEFAULT 0,
  cost_price numeric NOT NULL DEFAULT 0,
  expected_commission numeric NOT NULL DEFAULT 0,
  expected_commission_date date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_services ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own booking_services" ON public.booking_services FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. BOOKING PAYMENTS (Recebimentos do Cliente)
CREATE TABLE public.booking_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_method text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  installment_number integer,
  total_installments integer,
  due_date date,
  payment_date date,
  status text NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own booking_payments" ON public.booking_payments FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 4. BOOKING COMMISSIONS (Comissões dos Fornecedores)
CREATE TABLE public.booking_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_service_id uuid NOT NULL REFERENCES public.booking_services(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  supplier_id uuid REFERENCES public.clients(id) ON DELETE SET NULL,
  commission_amount numeric NOT NULL DEFAULT 0,
  expected_date date,
  received_date date,
  status text NOT NULL DEFAULT 'a_receber',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_commissions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own booking_commissions" ON public.booking_commissions FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 5. BOOKING DOCUMENTS (Documentos)
CREATE TABLE public.booking_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL,
  file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own booking_documents" ON public.booking_documents FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Function to recalculate booking total from services
CREATE OR REPLACE FUNCTION public.recalculate_booking_total()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.bookings
  SET total_amount = COALESCE((
    SELECT SUM(sale_price) FROM public.booking_services WHERE booking_id = COALESCE(NEW.booking_id, OLD.booking_id)
  ), 0),
  updated_at = now()
  WHERE id = COALESCE(NEW.booking_id, OLD.booking_id);
  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE TRIGGER recalc_booking_total_on_service
AFTER INSERT OR UPDATE OR DELETE ON public.booking_services
FOR EACH ROW EXECUTE FUNCTION recalculate_booking_total();
