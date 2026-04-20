import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";
import { Feature, ESSENCIAL_DAILY_LIMITS, START_DAILY_LIMITS } from "@/types/subscription";

/**
 * Returns YYYY-MM-DD for "today" in São Paulo (BRT/UTC-3, no DST since 2019).
 * Ensures the daily counter resets at local midnight, not UTC midnight.
 */
function getBrtDateString(): string {
  const now = new Date();
  const brt = new Date(now.getTime() - 3 * 60 * 60 * 1000);
  return brt.toISOString().split("T")[0];
}

export function useDailyLimit(feature: Feature) {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const queryClient = useQueryClient();

  let dailyLimit: number | null = null;
  if (plan === "essencial") {
    dailyLimit = ESSENCIAL_DAILY_LIMITS[feature] ?? null;
  } else if (plan === "start") {
    dailyLimit = START_DAILY_LIMITS[feature] ?? null;
  }
  const hasLimit = dailyLimit !== null;

  const { data: usageCount = 0, isLoading } = useQuery({
    queryKey: ["daily-usage", user?.id, feature],
    queryFn: async () => {
      if (!user || !hasLimit) return 0;

      const today = getBrtDateString();
      const { data, error } = await supabase
        .from("daily_feature_usage")
        .select("usage_count")
        .eq("user_id", user.id)
        .eq("feature", feature)
        .eq("usage_date", today)
        .maybeSingle();

      if (error) {
        console.error("Error fetching daily usage:", error);
        return 0;
      }
      return data?.usage_count ?? 0;
    },
    enabled: !!user && hasLimit,
  });

  const canUse = !hasLimit || usageCount < dailyLimit;
  const remaining = hasLimit ? Math.max(0, dailyLimit - usageCount) : Infinity;

  const incrementUsage = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const today = getBrtDateString();

      const { data: existing } = await supabase
        .from("daily_feature_usage")
        .select("id, usage_count")
        .eq("user_id", user.id)
        .eq("feature", feature)
        .eq("usage_date", today)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("daily_feature_usage")
          .update({ usage_count: existing.usage_count + 1 })
          .eq("id", existing.id);
      } else {
        await supabase
          .from("daily_feature_usage")
          .insert({ user_id: user.id, feature, usage_date: today, usage_count: 1 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-usage", user?.id, feature] });
    },
  });

  return {
    canUse,
    remaining,
    dailyLimit,
    hasLimit,
    usageCount,
    isLoading,
    incrementUsage: incrementUsage.mutateAsync,
  };
}
