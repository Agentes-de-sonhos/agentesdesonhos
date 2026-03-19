/**
 * Lightweight gamification hook for sidebar/layout components.
 * Only provides trackSectionVisit and myPoints — does NOT load
 * rankings, missions, or Q&A data.
 */
import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  POINTS_CONFIG,
  TRACKABLE_SECTIONS,
  awardGamificationPoints,
  getLevel,
  getLevelProgress,
  getNextLevel,
} from "@/lib/gamification";

export function useGamificationLite() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["gamification"] });
  }, [queryClient]);

  const awardPoints = useCallback(
    async (points: number, action: string, referenceId?: string) => {
      if (!user) return;
      const success = await awardGamificationPoints(user.id, points, action, referenceId);
      if (success) invalidate();
    },
    [user, invalidate]
  );

  const trackSectionVisit = useCallback(
    async (sectionKey: string) => {
      if (!user) return;
      const baseKey = Object.keys(TRACKABLE_SECTIONS).find((k) => sectionKey.startsWith(k));
      if (!baseKey) return;
      const today = new Date().toISOString().split("T")[0];
      const { error } = await supabase
        .from("gamification_daily_visits" as any)
        .insert({ user_id: user.id, visit_date: today, section_key: baseKey });
      if (!error) {
        await awardPoints(POINTS_CONFIG.menu_visit, "menu_visit");
      }
    },
    [user, awardPoints]
  );

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
    staleTime: 5 * 60 * 1000,
  });

  const myPoints = myPointsQuery.data || 0;

  return {
    trackSectionVisit,
    myPoints,
    level: getLevel(myPoints),
    levelProgress: getLevelProgress(myPoints),
    nextLevel: getNextLevel(myPoints),
  };
}
