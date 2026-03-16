import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useSubscription } from "./useSubscription";
import { Feature, ESSENCIAL_DAILY_LIMITS } from "@/types/subscription";

export function useDailyLimit(feature: Feature) {
  const { user } = useAuth();
  const { plan } = useSubscription();
  const queryClient = useQueryClient();

  const dailyLimit = plan === "essencial" ? (ESSENCIAL_DAILY_LIMITS[feature] ?? null) : null;
  const hasLimit = dailyLimit !== null;

  const { data: usageCount = 0, isLoading } = useQuery({
    queryKey: ["daily-usage", user?.id, feature],
    queryFn: async () => {
      if (!user || !hasLimit) return 0;

      const today = new Date().toISOString().split("T")[0];
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
      const today = new Date().toISOString().split("T")[0];

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
