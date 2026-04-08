import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { 
  Sale, 
  SaleProduct,
  CustomerPayment,
  SupplierPayment,
  IncomeEntry, 
  ExpenseEntry, 
  FinancialSummary, 
  SaleFormData,
  SaleProductFormData,
  CustomerPaymentFormData,
  SupplierPaymentFormData,
  IncomeFormData, 
  ExpenseFormData,
  ExpenseCategory,
  ProductType,
} from "@/types/financial";
import { PRODUCT_TYPES } from "@/types/financial";

export function useFinancial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales with products
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", user.id)
        .order("sale_date", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  // Fetch sale products
  const { data: saleProducts = [], isLoading: productsLoading } = useQuery({
    queryKey: ["sale_products", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sale_products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data.map(p => ({
        ...p,
        product_type: p.product_type as ProductType,
        commission_type: p.commission_type as 'percentage' | 'fixed',
      })) as SaleProduct[];
    },
    enabled: !!user,
  });

  // Fetch customer payments
  const { data: customerPayments = [], isLoading: customerPaymentsLoading } = useQuery({
    queryKey: ["customer_payments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("customer_payments")
        .select("*, sale:sales(*)")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as CustomerPayment[];
    },
    enabled: !!user,
  });

  // Fetch supplier payments
  const { data: supplierPayments = [], isLoading: supplierPaymentsLoading } = useQuery({
    queryKey: ["supplier_payments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("supplier_payments")
        .select("*")
        .eq("user_id", user.id)
        .order("payment_date", { ascending: false });
      if (error) throw error;
      return data as SupplierPayment[];
    },
    enabled: !!user,
  });

  // Fetch income entries (legacy)
  const { data: incomeEntries = [], isLoading: incomeLoading } = useQuery({
    queryKey: ["income_entries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("income_entries")
        .select("*, sale:sales(*)")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data as IncomeEntry[];
    },
    enabled: !!user,
  });

  // Fetch expense entries (legacy)
  const { data: expenseEntries = [], isLoading: expenseLoading } = useQuery({
    queryKey: ["expense_entries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("expense_entries")
        .select("*")
        .eq("user_id", user.id)
        .order("entry_date", { ascending: false });
      if (error) throw error;
      return data.map(e => ({
        ...e,
        category: e.category as ExpenseCategory,
        expense_type: (e as any).expense_type || 'variable',
        is_recurring: (e as any).is_recurring || false,
      })) as ExpenseEntry[];
    },
    enabled: !!user,
  });

  // Helper: calculate product-based total for a sale
  const getSaleProductsTotal = (saleId: string) =>
    saleProducts.filter(p => p.sale_id === saleId).reduce((sum, p) => sum + Number(p.sale_price), 0);

  // Helper: calculate commission for a product
  const calcProductCommission = (p: SaleProduct) => {
    const taxes = Number((p as any).non_commissionable_taxes) || 0;
    const base = Number(p.sale_price) - taxes;
    return p.commission_type === 'percentage'
      ? base * Number(p.commission_value) / 100
      : Number(p.commission_value);
  };

  // Calculate enhanced summary
  // BUSINESS LOGIC: For a travel agency, commission IS the revenue.
  // Profit = Total Commissions (from suppliers) - Total Expenses (operational + seller commissions)
  const summary: FinancialSummary = (() => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const yearStart = `${new Date().getFullYear()}-01-01`;

    // Use product totals when available, fallback to sale_amount
    const getSaleValue = (sale: Sale) => {
      const productTotal = getSaleProductsTotal(sale.id);
      return productTotal > 0 ? productTotal : Number(sale.sale_amount);
    };

    const salesToday = sales
      .filter(s => s.sale_date === today)
      .reduce((sum, s) => sum + getSaleValue(s), 0);

    const salesMonth = sales
      .filter(s => s.sale_date >= monthStartStr)
      .reduce((sum, s) => sum + getSaleValue(s), 0);

    const salesYear = sales
      .filter(s => s.sale_date >= yearStart)
      .reduce((sum, s) => sum + getSaleValue(s), 0);

    const totalSales = sales.reduce((sum, s) => sum + getSaleValue(s), 0);
    
    // Total commissions = agency revenue from suppliers
    const totalCommissions = saleProducts.reduce((sum, p) => sum + calcProductCommission(p), 0);
    
    // Total costs = cost_price of products (what's paid to suppliers)
    const totalCosts = saleProducts.reduce((sum, p) => sum + Number(p.cost_price), 0);
    
    // Gross profit = total sales - total costs (traditional view)
    const grossProfit = totalSales - totalCosts;
    
    // Net profit = commissions (revenue) - expenses (operational costs including seller commissions)
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const netProfit = totalCommissions - totalExpenses;

    const totalCustomerPayments = customerPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const totalSupplierPayments = supplierPayments.reduce((sum, p) => sum + Number(p.amount), 0);
    const cashBalance = totalCustomerPayments - totalSupplierPayments;

    return {
      salesToday,
      salesMonth,
      salesYear,
      totalSales,
      totalCosts,
      grossProfit,
      totalCommissions,
      netProfit,
      totalCustomerPayments,
      totalSupplierPayments,
      cashBalance,
    };
  })();

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (formData: SaleFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("sales")
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Venda registrada", description: "A venda foi salva com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar venda", description: error.message, variant: "destructive" });
    },
  });

  // Auto-sync sale_amount from products total
  const syncSaleAmount = async (saleId: string) => {
    const { data: products } = await supabase
      .from("sale_products")
      .select("sale_price")
      .eq("sale_id", saleId);
    if (products && products.length > 0) {
      const total = products.reduce((sum, p) => sum + Number(p.sale_price), 0);
      await supabase.from("sales").update({ sale_amount: total }).eq("id", saleId);
    }
  };

  // Delete sale mutation
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      // Clean up seller commission expenses
      if (user) {
        await supabase.from("expense_entries").delete().eq("sale_id", id).eq("category", "comissao").eq("user_id", user.id);
      }
      // Clean up auto-generated income entries
      if (user) {
        await supabase.from("income_entries").delete().eq("sale_id", id).eq("user_id", user.id);
      }
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale_products"] });
      queryClient.invalidateQueries({ queryKey: ["customer_payments"] });
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
      queryClient.invalidateQueries({ queryKey: ["commissions-receivable"] });
      toast({ title: "Venda excluída", description: "A venda foi removida." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir venda", description: error.message, variant: "destructive" });
    },
  });

  // Helper to calculate commission amount
  const calcCommissionAmount = (formData: SaleProductFormData) => {
    const taxes = Number(formData.non_commissionable_taxes) || 0;
    const base = Number(formData.sale_price) - taxes;
    if (formData.commission_type === 'percentage') {
      return base * (Number(formData.commission_value) || 0) / 100;
    }
    return Number(formData.commission_value) || 0;
  };

  // Auto-generate income entry for a product
  const syncIncomeEntry = async (productId: string, saleId: string, formData: SaleProductFormData) => {
    if (!user) return;
    const commissionAmount = calcCommissionAmount(formData);
    if (commissionAmount <= 0) return;

    // Check if income entry already exists for this product
    const { data: existing } = await supabase
      .from("income_entries")
      .select("id")
      .eq("sale_product_id", productId)
      .eq("user_id", user.id)
      .maybeSingle();

    const entryData = {
      sale_id: saleId,
      sale_product_id: productId,
      amount: commissionAmount,
      entry_date: formData.expected_date || new Date().toISOString().split("T")[0],
      expected_date: formData.expected_date || null,
      payment_method: "pix",
      status: "pending",
      source: "auto",
      notes: `Comissão: ${formData.supplier_name || PRODUCT_TYPES[formData.product_type] || formData.product_type}`,
      user_id: user.id,
    };

    if (existing) {
      await supabase.from("income_entries").update(entryData).eq("id", existing.id);
    } else {
      await supabase.from("income_entries").insert(entryData);
    }
  };

  // Remove auto-generated income entry for a product
  const removeIncomeEntry = async (productId: string) => {
    if (!user) return;
    await supabase.from("income_entries").delete().eq("sale_product_id", productId).eq("user_id", user.id);
  };

  // Create sale product mutation
  const createSaleProductMutation = useMutation({
    mutationFn: async ({ saleId, ...formData }: SaleProductFormData & { saleId: string }) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("sale_products")
        .insert({
          user_id: user.id,
          sale_id: saleId,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      // Auto-generate income entry
      await syncIncomeEntry(data.id, saleId, formData);
      // Auto-sync sale_amount from products
      await syncSaleAmount(saleId);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale_products"] });
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      queryClient.invalidateQueries({ queryKey: ["commissions-receivable"] });
      toast({ title: "Produto adicionado", description: "O produto foi vinculado à venda." });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar produto", description: error.message, variant: "destructive" });
    },
  });

  // Delete sale product mutation
  const deleteSaleProductMutation = useMutation({
    mutationFn: async (id: string) => {
      // Get sale_id before deleting
      const { data: product } = await supabase.from("sale_products").select("sale_id").eq("id", id).single();
      // Remove auto-generated income entry first
      await removeIncomeEntry(id);
      const { error } = await supabase.from("sale_products").delete().eq("id", id);
      if (error) throw error;
      // Auto-sync sale_amount after product removal
      if (product?.sale_id) {
        await syncSaleAmount(product.sale_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale_products"] });
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      queryClient.invalidateQueries({ queryKey: ["commissions-receivable"] });
      toast({ title: "Produto removido", description: "O produto foi desvinculado." });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover produto", description: error.message, variant: "destructive" });
    },
  });

  // Create customer payment mutation
  const createCustomerPaymentMutation = useMutation({
    mutationFn: async (formData: CustomerPaymentFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("customer_payments")
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_payments"] });
      toast({ title: "Recebimento registrado", description: "O pagamento do cliente foi salvo." });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar recebimento", description: error.message, variant: "destructive" });
    },
  });

  // Delete customer payment mutation
  const deleteCustomerPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("customer_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["customer_payments"] });
      toast({ title: "Recebimento excluído", description: "O pagamento foi removido." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir recebimento", description: error.message, variant: "destructive" });
    },
  });

  // Create supplier payment mutation
  const createSupplierPaymentMutation = useMutation({
    mutationFn: async (formData: SupplierPaymentFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("supplier_payments")
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_payments"] });
      toast({ title: "Pagamento registrado", description: "O pagamento ao fornecedor foi salvo." });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar pagamento", description: error.message, variant: "destructive" });
    },
  });

  // Delete supplier payment mutation
  const deleteSupplierPaymentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("supplier_payments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier_payments"] });
      toast({ title: "Pagamento excluído", description: "O pagamento foi removido." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir pagamento", description: error.message, variant: "destructive" });
    },
  });

  // Legacy income mutation
  const createIncomeMutation = useMutation({
    mutationFn: async (formData: IncomeFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("income_entries")
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      toast({ title: "Entrada registrada", description: "O recebimento foi salvo." });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar entrada", description: error.message, variant: "destructive" });
    },
  });

  const deleteIncomeMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("income_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      toast({ title: "Entrada excluída", description: "O recebimento foi removido." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir entrada", description: error.message, variant: "destructive" });
    },
  });

  // Update sale mutation
  const updateSaleMutation = useMutation({
    mutationFn: async ({ id, ...formData }: SaleFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("sales")
        .update(formData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      toast({ title: "Venda atualizada", description: "Os dados foram salvos." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar venda", description: error.message, variant: "destructive" });
    },
  });

  // Update sale product mutation
  const updateSaleProductMutation = useMutation({
    mutationFn: async ({ id, ...formData }: SaleProductFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("sale_products")
        .update(formData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      // Sync income entry with updated data
      await syncIncomeEntry(id, data.sale_id, formData);
      // Auto-sync sale_amount from products
      await syncSaleAmount(data.sale_id);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["sale_products"] });
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      queryClient.invalidateQueries({ queryKey: ["commissions-receivable"] });
      toast({ title: "Produto atualizado", description: "Os dados foram salvos." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar produto", description: error.message, variant: "destructive" });
    },
  });

  // Update income mutation
  const updateIncomeMutation = useMutation({
    mutationFn: async ({ id, ...formData }: IncomeFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("income_entries")
        .update(formData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      toast({ title: "Entrada atualizada", description: "Os dados foram salvos." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar entrada", description: error.message, variant: "destructive" });
    },
  });

  // Update expense mutation
  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, ...formData }: ExpenseFormData & { id: string }) => {
      const { data, error } = await supabase
        .from("expense_entries")
        .update(formData)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
      toast({ title: "Despesa atualizada", description: "Os dados foram salvos." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar despesa", description: error.message, variant: "destructive" });
    },
  });

  // Legacy expense mutation
  const createExpenseMutation = useMutation({
    mutationFn: async (formData: ExpenseFormData) => {
      if (!user) throw new Error("User not authenticated");
      const { data, error } = await supabase
        .from("expense_entries")
        .insert({
          user_id: user.id,
          ...formData,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
      toast({ title: "Despesa registrada", description: "A saída foi salva." });
    },
    onError: (error) => {
      toast({ title: "Erro ao registrar despesa", description: error.message, variant: "destructive" });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expense_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["expense_entries"] });
      toast({ title: "Despesa excluída", description: "A saída foi removida." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir despesa", description: error.message, variant: "destructive" });
    },
  });

  return {
    sales,
    saleProducts,
    customerPayments,
    supplierPayments,
    incomeEntries,
    expenseEntries,
    summary,
    isLoading: salesLoading || productsLoading || customerPaymentsLoading || supplierPaymentsLoading || incomeLoading || expenseLoading,
    createSale: createSaleMutation.mutateAsync,
    updateSale: updateSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
    createSaleProduct: createSaleProductMutation.mutateAsync,
    updateSaleProduct: updateSaleProductMutation.mutateAsync,
    deleteSaleProduct: deleteSaleProductMutation.mutateAsync,
    createCustomerPayment: createCustomerPaymentMutation.mutateAsync,
    deleteCustomerPayment: deleteCustomerPaymentMutation.mutateAsync,
    createSupplierPayment: createSupplierPaymentMutation.mutateAsync,
    deleteSupplierPayment: deleteSupplierPaymentMutation.mutateAsync,
    createIncome: createIncomeMutation.mutateAsync,
    updateIncome: updateIncomeMutation.mutateAsync,
    deleteIncome: deleteIncomeMutation.mutateAsync,
    createExpense: createExpenseMutation.mutateAsync,
    updateExpense: updateExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    isCreating: createSaleMutation.isPending || createSaleProductMutation.isPending || 
                createCustomerPaymentMutation.isPending || createSupplierPaymentMutation.isPending ||
                createIncomeMutation.isPending || createExpenseMutation.isPending,
    isUpdating: updateSaleMutation.isPending || updateSaleProductMutation.isPending ||
                updateIncomeMutation.isPending || updateExpenseMutation.isPending,
  };
}

// Hook to fetch closed opportunities for auto-import
export function useClosedOpportunities() {
  const { user } = useAuth();

  const { data: closedOpportunities = [], isLoading } = useQuery({
    queryKey: ["closed-opportunities", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, client:clients(name)")
        .eq("user_id", user.id)
        .eq("stage", "closed")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { closedOpportunities, isLoading };
}
