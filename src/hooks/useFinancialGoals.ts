import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface FinancialGoal {
  id: string;
  user_id: string;
  month: number;
  year: number;
  profit_goal: number;
  commission_margin: number;
  created_at: string;
  updated_at: string;
}

export function useFinancialGoals() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const { data: goal, isLoading } = useQuery({
    queryKey: ["financial-goal", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("financial_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();
      if (error) throw error;
      return data as FinancialGoal | null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const upsertGoal = useMutation({
    mutationFn: async (values: { profit_goal: number; commission_margin: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("financial_goals")
        .upsert({
          user_id: user.id,
          month: currentMonth,
          year: currentYear,
          profit_goal: values.profit_goal,
          commission_margin: values.commission_margin,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,month,year" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["financial-goal"] });
      toast({ title: "Meta salva", description: "Sua meta mensal foi atualizada." });
    },
    onError: (error) => {
      toast({ title: "Erro ao salvar meta", description: error.message, variant: "destructive" });
    },
  });

  return {
    goal,
    isLoading,
    upsertGoal,
    currentMonth,
    currentYear,
  };
}
