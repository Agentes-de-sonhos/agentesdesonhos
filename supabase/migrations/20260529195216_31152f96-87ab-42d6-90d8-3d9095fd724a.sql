
-- =========================================================================
-- P0 — Correções críticas de segurança no módulo Financeiro
-- =========================================================================

-- 1) sale_products: impedir injeção de produtos em vendas de outro usuário
--    A policy de INSERT/UPDATE passa a exigir que o sale_id referenciado
--    pertença ao mesmo usuário autenticado.
DROP POLICY IF EXISTS "Users can create their own sale products" ON public.sale_products;
CREATE POLICY "Users can create their own sale products"
ON public.sale_products
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_products.sale_id
      AND s.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Users can update their own sale products" ON public.sale_products;
CREATE POLICY "Users can update their own sale products"
ON public.sale_products
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_products.sale_id
      AND s.user_id = auth.uid()
  )
)
WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (
    SELECT 1 FROM public.sales s
    WHERE s.id = sale_products.sale_id
      AND s.user_id = auth.uid()
  )
);

-- 2) CHECK constraints de positividade em valores financeiros.
--    Usamos NOT VALID para não falhar com dados históricos eventuais;
--    novas inserções/atualizações passam a ser bloqueadas imediatamente.

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_amount_positive
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.income_entries
  ADD CONSTRAINT income_entries_amount_positive
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.customer_payments
  ADD CONSTRAINT customer_payments_amount_positive
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.supplier_payments
  ADD CONSTRAINT supplier_payments_amount_positive
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.invoice_payments
  ADD CONSTRAINT invoice_payments_amount_positive
  CHECK (amount > 0) NOT VALID;

ALTER TABLE public.sale_products
  ADD CONSTRAINT sale_products_sale_price_positive
  CHECK (sale_price > 0) NOT VALID;

-- Para sales.sale_amount usamos >= 0 porque o fluxo atual cria a venda
-- com valor 0 e atualiza após adicionar produtos. Bloqueia apenas valores
-- negativos, que nunca são legítimos.
ALTER TABLE public.sales
  ADD CONSTRAINT sales_sale_amount_non_negative
  CHECK (sale_amount >= 0) NOT VALID;
