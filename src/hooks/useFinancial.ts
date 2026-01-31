import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { 
  Sale, 
  IncomeEntry, 
  ExpenseEntry, 
  FinancialSummary, 
  SaleFormData, 
  IncomeFormData, 
  ExpenseFormData,
  ExpenseCategory,
} from "@/types/financial";

export function useFinancial() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch sales
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["sales", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", user.id)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data as Sale[];
    },
    enabled: !!user,
  });

  // Fetch income entries
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

  // Fetch expense entries
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
        category: e.category as ExpenseCategory
      })) as ExpenseEntry[];
    },
    enabled: !!user,
  });

  // Calculate summary
  const summary: FinancialSummary = (() => {
    const today = new Date().toISOString().split("T")[0];
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().split("T")[0];
    const yearStart = `${new Date().getFullYear()}-01-01`;

    const salesToday = sales
      .filter(s => s.sale_date === today)
      .reduce((sum, s) => sum + Number(s.sale_amount), 0);

    const salesMonth = sales
      .filter(s => s.sale_date >= monthStartStr)
      .reduce((sum, s) => sum + Number(s.sale_amount), 0);

    const salesYear = sales
      .filter(s => s.sale_date >= yearStart)
      .reduce((sum, s) => sum + Number(s.sale_amount), 0);

    const totalSales = sales.reduce((sum, s) => sum + Number(s.sale_amount), 0);
    const totalIncome = incomeEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    const totalExpenses = expenseEntries.reduce((sum, e) => sum + Number(e.amount), 0);

    return {
      salesToday,
      salesMonth,
      salesYear,
      totalSales,
      totalIncome,
      totalExpenses,
      result: totalIncome - totalExpenses,
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

  // Delete sale mutation
  const deleteSaleMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["income_entries"] });
      toast({ title: "Venda excluída", description: "A venda foi removida." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir venda", description: error.message, variant: "destructive" });
    },
  });

  // Create income mutation
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

  // Delete income mutation
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

  // Create expense mutation
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

  // Delete expense mutation
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
    incomeEntries,
    expenseEntries,
    summary,
    isLoading: salesLoading || incomeLoading || expenseLoading,
    createSale: createSaleMutation.mutateAsync,
    deleteSale: deleteSaleMutation.mutateAsync,
    createIncome: createIncomeMutation.mutateAsync,
    deleteIncome: deleteIncomeMutation.mutateAsync,
    createExpense: createExpenseMutation.mutateAsync,
    deleteExpense: deleteExpenseMutation.mutateAsync,
    isCreating: createSaleMutation.isPending || createIncomeMutation.isPending || createExpenseMutation.isPending,
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
