import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const MONTH_NAMES = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export function useMonthlyPopup() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const now = new Date();
  const currentDay = now.getDate();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthName = MONTH_NAMES[currentMonth - 1];

  // Only eligible days 1-7
  const isEligiblePeriod = currentDay >= 1 && currentDay <= 7;

  // Check if already viewed this month
  const { data: alreadyViewed, isLoading: viewLoading } = useQuery({
    queryKey: ["monthly-popup-view", currentMonth, currentYear],
    queryFn: async () => {
      if (!user) return true;
      const { data } = await supabase
        .from("monthly_popup_views")
        .select("id")
        .eq("user_id", user.id)
        .eq("viewed_month", currentMonth)
        .eq("viewed_year", currentYear)
        .maybeSingle();
      return !!data;
    },
    enabled: !!user && isEligiblePeriod,
  });

  // Fetch phrase
  const { data: phrase } = useQuery({
    queryKey: ["monthly-phrase", currentMonth],
    queryFn: async () => {
      const { data } = await supabase
        .from("monthly_phrases")
        .select("phrase")
        .eq("month", currentMonth)
        .maybeSingle();
      return data?.phrase || "";
    },
    enabled: !!user && isEligiblePeriod && alreadyViewed === false,
  });

  // Fetch holidays & commemorative dates for current month
  const { data: events } = useQuery({
    queryKey: ["monthly-popup-events", currentMonth, currentYear],
    queryFn: async () => {
      const startOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-01`;
      const lastDay = new Date(currentYear, currentMonth, 0).getDate();
      const endOfMonth = `${currentYear}-${String(currentMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

      const { data } = await supabase
        .from("preset_events")
        .select("id, title, event_date, event_type, color")
        .eq("is_active", true)
        .in("event_type", ["feriado", "comemorativo"])
        .gte("event_date", startOfMonth)
        .lte("event_date", endOfMonth)
        .order("event_date", { ascending: true });

      return data || [];
    },
    enabled: !!user && isEligiblePeriod && alreadyViewed === false,
  });

  // Mark as viewed
  const markViewed = useMutation({
    mutationFn: async () => {
      if (!user) return;
      await supabase.from("monthly_popup_views").insert({
        user_id: user.id,
        viewed_month: currentMonth,
        viewed_year: currentYear,
      });
    },
    onSuccess: () => {
      queryClient.setQueryData(["monthly-popup-view", currentMonth, currentYear], true);
    },
  });

  const shouldShow = isEligiblePeriod && !viewLoading && alreadyViewed === false && !!user;

  return {
    shouldShow,
    phrase: phrase || "",
    events: events || [],
    monthName,
    currentMonth,
    currentYear,
    markViewed: markViewed.mutate,
  };
}
