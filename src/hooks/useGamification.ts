import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface RankingEntry {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  agency_name: string | null;
  total_points: number;
}

export function useGamification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const awardPoints = useCallback(
    async (points: number, action: string, referenceId?: string) => {
      if (!user) return;
      await supabase.from("gamification_points").insert({
        user_id: user.id,
        points,
        action,
        reference_id: referenceId || null,
      });
      queryClient.invalidateQueries({ queryKey: ["gamification"] });
    },
    [user, queryClient]
  );

  const registerDailyLogin = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];

    // Check if already logged today
    const { data: existing } = await supabase
      .from("gamification_daily_login")
      .select("id")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .maybeSingle();

    if (!existing) {
      await supabase
        .from("gamification_daily_login")
        .insert({ user_id: user.id, login_date: today });
      await awardPoints(1, "daily_login");
    }
  }, [user, awardPoints]);

  const myPointsQuery = useQuery({
    queryKey: ["gamification", "my-points", user?.id],
    queryFn: async () => {
      if (!user) return 0;
      const { data, error } = await supabase
        .from("gamification_points")
        .select("points")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []).reduce((sum: number, row: any) => sum + row.points, 0);
    },
    enabled: !!user,
  });

  const rankingQuery = useQuery({
    queryKey: ["gamification", "ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gamification_ranking", {
        limit_count: 20,
      });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
    enabled: !!user,
  });

  return {
    awardPoints,
    registerDailyLogin,
    myPoints: myPointsQuery.data || 0,
    ranking: rankingQuery.data || [],
    isLoadingRanking: rankingQuery.isLoading,
  };
}
