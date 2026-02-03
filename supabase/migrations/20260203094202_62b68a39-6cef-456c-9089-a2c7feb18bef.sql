-- Verificar e recriar políticas RLS para tabela sales
-- Primeiro, dropar todas as políticas existentes para garantir limpeza
DROP POLICY IF EXISTS "Users can view their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can create their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can update their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can delete their own sales" ON public.sales;
DROP POLICY IF EXISTS "Users can view own sales or admin can view all" ON public.sales;
DROP POLICY IF EXISTS "Admins can view all sales" ON public.sales;

-- Garantir que RLS está habilitado
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

-- Policy para SELECT: usuário vê próprias vendas OU admin vê todas
CREATE POLICY "Users can view own sales or admin can view all"
ON public.sales
FOR SELECT
USING (
  auth.uid() = user_id 
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- Policy para INSERT: usuário só pode criar vendas para si mesmo
CREATE POLICY "Users can create their own sales"
ON public.sales
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy para UPDATE: usuário só pode atualizar próprias vendas
CREATE POLICY "Users can update their own sales"
ON public.sales
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy para DELETE: usuário só pode deletar próprias vendas
CREATE POLICY "Users can delete their own sales"
ON public.sales
FOR DELETE
USING (auth.uid() = user_id);