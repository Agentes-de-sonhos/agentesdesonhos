import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { awardGamificationPoints, POINTS_CONFIG } from "@/lib/gamification";
import type { Client, Opportunity, OpportunityStage, SalesGoal, ClientStatus } from "@/types/crm";

export function useClients() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as Client[];
    },
    enabled: !!user,
  });

  const createClientMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      email?: string | null;
      phone?: string | null;
      city?: string | null;
      notes?: string | null;
      status?: ClientStatus;
      travel_preferences?: string | null;
      internal_notes?: string | null;
      birthday_day?: number | null;
      birthday_month?: number | null;
      birthday_year?: number | null;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: result, error } = await supabase
        .from("clients")
        .insert({
          ...data,
          user_id: user.id,
          status: data.status || "lead",
        })
        .select()
        .single();
      if (error) throw error;
      return result as Client;
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente criado com sucesso" });
      if (result?.id) awardGamificationPoints(result.user_id, POINTS_CONFIG.create_client, "create_client", result.id);
    },
    onError: (error) => {
      toast({ title: "Erro ao criar cliente", description: error.message, variant: "destructive" });
    },
  });

  const updateClientMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Client> & { id: string }) => {
      const { error } = await supabase.from("clients").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente atualizado" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar cliente", description: error.message, variant: "destructive" });
    },
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("clients").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast({ title: "Cliente excluído" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir cliente", description: error.message, variant: "destructive" });
    },
  });

  return {
    clients,
    isLoading,
    createClient: createClientMutation.mutateAsync,
    updateClient: updateClientMutation.mutateAsync,
    deleteClient: deleteClientMutation.mutateAsync,
    isCreating: createClientMutation.isPending,
  };
}

export function useClientDetails(clientId: string) {
  const { data: sales = [], isLoading: salesLoading } = useQuery({
    queryKey: ["client-sales", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sales")
        .select("*")
        .eq("client_id", clientId)
        .order("sale_date", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!clientId,
  });

  const { data: opportunities = [], isLoading: oppsLoading } = useQuery({
    queryKey: ["client-opportunities", clientId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunities")
        .select("*")
        .eq("client_id", clientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Opportunity[];
    },
    enabled: !!clientId,
  });

  return {
    sales,
    opportunities,
    isLoading: salesLoading || oppsLoading,
  };
}

export function useOpportunities() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading } = useQuery({
    queryKey: ["opportunities", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("opportunities")
        .select("*, client:clients(*)")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data.map((o) => ({
        ...o,
        stage: o.stage as OpportunityStage,
        client: o.client as Client,
      })) as Opportunity[];
    },
    enabled: !!user,
  });

  const createOpportunityMutation = useMutation({
    mutationFn: async (data: {
      client_id: string;
      destination: string;
      start_date?: string;
      end_date?: string;
      passengers_count: number;
      estimated_value: number;
      notes?: string;
      follow_up_date?: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { data: result, error } = await supabase
        .from("opportunities")
        .insert({ ...data, user_id: user.id, stage: "new_contact" })
        .select("*, client:clients(*)")
        .single();
      if (error) throw error;

      await supabase.from("opportunity_history").insert({
        opportunity_id: result.id,
        from_stage: null,
        to_stage: "new_contact",
      });

      return result as Opportunity;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Oportunidade criada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar oportunidade", description: error.message, variant: "destructive" });
    },
  });

  const updateOpportunityMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Opportunity> & { id: string }) => {
      const { error } = await supabase.from("opportunities").update(data).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Oportunidade atualizada" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  const updateStageMutation = useMutation({
    mutationFn: async ({
      id,
      fromStage,
      toStage,
    }: {
      id: string;
      fromStage: OpportunityStage;
      toStage: OpportunityStage;
    }) => {
      const { error: updateError } = await supabase
        .from("opportunities")
        .update({ stage: toStage })
        .eq("id", id);
      if (updateError) throw updateError;

      const { error: historyError } = await supabase.from("opportunity_history").insert({
        opportunity_id: id,
        from_stage: fromStage,
        to_stage: toStage,
      });
      if (historyError) throw historyError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      queryClient.invalidateQueries({ queryKey: ["sales-stats"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao mover", description: error.message, variant: "destructive" });
    },
  });

  const deleteOpportunityMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunities").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      toast({ title: "Oportunidade excluída" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  return {
    opportunities,
    isLoading,
    createOpportunity: createOpportunityMutation.mutateAsync,
    updateOpportunity: updateOpportunityMutation.mutateAsync,
    updateStage: updateStageMutation.mutateAsync,
    deleteOpportunity: deleteOpportunityMutation.mutateAsync,
    isCreating: createOpportunityMutation.isPending,
  };
}

export function useSalesGoals(month: number, year: number) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: goal, isLoading } = useQuery({
    queryKey: ["sales-goal", user?.id, month, year],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("sales_goals")
        .select("*")
        .eq("user_id", user.id)
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();
      if (error) throw error;
      return data as SalesGoal | null;
    },
    enabled: !!user,
  });

  const setGoalMutation = useMutation({
    mutationFn: async (targetAmount: number) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("sales_goals").upsert(
        {
          user_id: user.id,
          month,
          year,
          target_amount: targetAmount,
        },
        { onConflict: "user_id,month,year" }
      );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-goal"] });
      toast({ title: "Meta definida com sucesso" });
    },
    onError: (error) => {
      toast({ title: "Erro ao definir meta", description: error.message, variant: "destructive" });
    },
  });

  return {
    goal,
    isLoading,
    setGoal: setGoalMutation.mutateAsync,
    isSettingGoal: setGoalMutation.isPending,
  };
}

export function useSalesStats(month: number, year: number) {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["sales-stats", user?.id, month, year],
    queryFn: async () => {
      if (!user) return null;

      // Get current month sales
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const { data: sales, error } = await supabase
        .from("sales")
        .select("*")
        .eq("user_id", user.id)
        .gte("sale_date", startDate.toISOString().split("T")[0])
        .lte("sale_date", endDate.toISOString().split("T")[0]);

      if (error) throw error;

      // Get previous month sales
      const prevStartDate = new Date(year, month - 2, 1);
      const prevEndDate = new Date(year, month - 1, 0);

      const { data: prevSales } = await supabase
        .from("sales")
        .select("sale_amount")
        .eq("user_id", user.id)
        .gte("sale_date", prevStartDate.toISOString().split("T")[0])
        .lte("sale_date", prevEndDate.toISOString().split("T")[0]);

      const totalSold = sales?.reduce((sum, s) => sum + s.sale_amount, 0) || 0;
      const salesCount = sales?.length || 0;
      const biggestSale = sales?.reduce((max, s) => Math.max(max, s.sale_amount), 0) || 0;
      const previousMonthTotal = prevSales?.reduce((sum, s) => sum + s.sale_amount, 0) || 0;

      // Find top client
      const clientSales: Record<string, number> = {};
      sales?.forEach((s) => {
        clientSales[s.client_name] = (clientSales[s.client_name] || 0) + s.sale_amount;
      });
      const topClient = Object.entries(clientSales).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Group by day
      const dailySalesMap: Record<string, { total: number; count: number }> = {};
      sales?.forEach((s) => {
        const date = s.sale_date;
        if (!dailySalesMap[date]) {
          dailySalesMap[date] = { total: 0, count: 0 };
        }
        dailySalesMap[date].total += s.sale_amount;
        dailySalesMap[date].count += 1;
      });

      const dailySales = Object.entries(dailySalesMap)
        .map(([date, data]) => ({ date, ...data }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      return {
        totalSold,
        salesCount,
        biggestSale,
        previousMonthTotal,
        topClient,
        dailySales,
      };
    },
    enabled: !!user,
  });

  return { stats, isLoading };
}

export function useOpportunityHistory(opportunityId: string) {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["opportunity-history", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunity_history")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!opportunityId,
  });

  return { history, isLoading };
}
