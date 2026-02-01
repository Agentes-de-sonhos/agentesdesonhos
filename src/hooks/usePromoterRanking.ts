import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PromoterMonthlyWinner, PromoterSettings, PromoterRankingEntry, RankingCriteria } from "@/types/promoter";

export function usePromoterSettings() {
  return useQuery({
    queryKey: ["promoter-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoter_settings")
        .select("*")
        .limit(1)
        .single();

      if (error) throw error;
      return data as PromoterSettings;
    },
  });
}

export function useUpdatePromoterSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (settings: Partial<PromoterSettings>) => {
      const { data: existing } = await supabase
        .from("promoter_settings")
        .select("id")
        .limit(1)
        .single();

      if (existing) {
        const { error } = await supabase
          .from("promoter_settings")
          .update(settings)
          .eq("id", existing.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promoter-settings"] });
      toast.success("Configurações atualizadas!");
    },
    onError: () => {
      toast.error("Erro ao atualizar configurações");
    },
  });
}

export function useMonthlyRanking(month: number, year: number) {
  return useQuery({
    queryKey: ["promoter-ranking", month, year],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_monthly_sales_ranking", {
        target_month: month,
        target_year: year,
      });

      if (error) throw error;
      return (data || []) as PromoterRankingEntry[];
    },
  });
}

export function useMonthlyWinner(month: number, year: number) {
  return useQuery({
    queryKey: ["promoter-winner", month, year],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoter_monthly_winners")
        .select("*")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      if (error) throw error;
      return data as PromoterMonthlyWinner | null;
    },
  });
}

export function useHistoricalWinners() {
  return useQuery({
    queryKey: ["promoter-historical-winners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("promoter_monthly_winners")
        .select("*")
        .eq("is_confirmed", true)
        .order("year", { ascending: false })
        .order("month", { ascending: false });

      if (error) throw error;
      
      // Fetch profile info for each winner
      const winnersWithProfiles = await Promise.all(
        (data || []).map(async (winner) => {
          const { data: profile } = await supabase
            .from("profiles")
            .select("name, avatar_url")
            .eq("user_id", winner.user_id)
            .single();
          
          return {
            ...winner,
            profile: profile || { name: "Usuário", avatar_url: null },
          } as PromoterMonthlyWinner;
        })
      );

      return winnersWithProfiles;
    },
  });
}

export function useConfirmWinner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      userId,
      month,
      year,
      criteria,
      salesCount,
      revenue,
      prizeName,
      prizeDescription,
      prizeImageUrl,
    }: {
      userId: string;
      month: number;
      year: number;
      criteria: RankingCriteria;
      salesCount: number;
      revenue: number;
      prizeName?: string;
      prizeDescription?: string;
      prizeImageUrl?: string;
    }) => {
      // Check if winner already exists for this month
      const { data: existing } = await supabase
        .from("promoter_monthly_winners")
        .select("id")
        .eq("month", month)
        .eq("year", year)
        .maybeSingle();

      const { data: { user } } = await supabase.auth.getUser();

      if (existing) {
        const { error } = await supabase
          .from("promoter_monthly_winners")
          .update({
            user_id: userId,
            ranking_criteria: criteria,
            total_sales_count: salesCount,
            total_revenue: revenue,
            prize_name: prizeName,
            prize_description: prizeDescription,
            prize_image_url: prizeImageUrl,
            is_confirmed: true,
            confirmed_at: new Date().toISOString(),
            confirmed_by: user?.id,
          })
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("promoter_monthly_winners")
          .insert({
            user_id: userId,
            month,
            year,
            ranking_criteria: criteria,
            total_sales_count: salesCount,
            total_revenue: revenue,
            prize_name: prizeName,
            prize_description: prizeDescription,
            prize_image_url: prizeImageUrl,
            is_confirmed: true,
            confirmed_at: new Date().toISOString(),
            confirmed_by: user?.id,
          });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["promoter-winner"] });
      queryClient.invalidateQueries({ queryKey: ["promoter-historical-winners"] });
      toast.success("Vencedor confirmado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao confirmar vencedor");
    },
  });
}
