import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import {
  POINTS_CONFIG,
  TRACKABLE_SECTIONS,
  MISSIONS,
  awardGamificationPoints,
  getLevel,
  getLevelProgress,
  getNextLevel,
  type MissionDef,
} from "@/lib/gamification";

export type { MissionDef };
export { POINTS_CONFIG, getLevel, getLevelProgress, getNextLevel };

export interface RankingEntry {
  user_id: string;
  user_name: string;
  avatar_url: string | null;
  agency_name: string | null;
  total_points: number;
}

export interface MissionProgress {
  mission: MissionDef;
  progress: number[]; // count per requirement
  completed: boolean;
}

function getWeekKey() {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const week = Math.ceil(((now.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${week}`;
}

function getStrategicKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function useGamification() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const invalidate = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["gamification"] });
  }, [queryClient]);

  // ─── Award Points ──────────────────────────────────────
  const awardPoints = useCallback(
    async (points: number, action: string, referenceId?: string) => {
      if (!user) return;
      const success = await awardGamificationPoints(user.id, points, action, referenceId);
      if (success) invalidate();
    },
    [user, invalidate]
  );

  // ─── Daily Login ───────────────────────────────────────
  const registerDailyLogin = useCallback(async () => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    const { data: existing } = await supabase
      .from("gamification_daily_login")
      .select("id")
      .eq("user_id", user.id)
      .eq("login_date", today)
      .maybeSingle();
    if (!existing) {
      await supabase.from("gamification_daily_login").insert({ user_id: user.id, login_date: today });
      await awardPoints(POINTS_CONFIG.daily_login, "daily_login");
    }
  }, [user, awardPoints]);

  // ─── Section Visit ─────────────────────────────────────
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

  // ─── My Points ─────────────────────────────────────────
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
    staleTime: 2 * 60 * 1000,
  });

  // ─── Rankings ──────────────────────────────────────────
  const rankingQuery = useQuery({
    queryKey: ["gamification", "ranking"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_gamification_ranking", { limit_count: 50 });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
  });

  const weeklyRankingQuery = useQuery({
    queryKey: ["gamification", "ranking-weekly"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_gamification_ranking_weekly", { limit_count: 50 });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
    enabled: !!user,
  });

  const vendasRankingQuery = useQuery({
    queryKey: ["gamification", "ranking-category", "vendas"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_gamification_ranking_by_category", {
        category_name: "vendas",
        limit_count: 50,
      });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
    enabled: !!user,
  });

  const conteudoRankingQuery = useQuery({
    queryKey: ["gamification", "ranking-category", "conteudo"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_gamification_ranking_by_category", {
        category_name: "conteudo",
        limit_count: 50,
      });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
    enabled: !!user,
  });

  const educacaoRankingQuery = useQuery({
    queryKey: ["gamification", "ranking-category", "educacao"],
    queryFn: async () => {
      const { data, error } = await (supabase.rpc as any)("get_gamification_ranking_by_category", {
        category_name: "educacao",
        limit_count: 50,
      });
      if (error) throw error;
      return (data || []) as RankingEntry[];
    },
    enabled: !!user,
  });

  // ─── Today's Actions (for missions) ───────────────────
  const todayActionsQuery = useQuery({
    queryKey: ["gamification", "today-actions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("gamification_points")
        .select("action")
        .eq("user_id", user.id)
        .gte("created_at", today + "T00:00:00.000Z")
        .lte("created_at", today + "T23:59:59.999Z");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 30000,
  });

  // ─── This Week's Actions (for missions) ───────────────
  const weekActionsQuery = useQuery({
    queryKey: ["gamification", "week-actions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const now = new Date();
      const dayOfWeek = now.getDay();
      const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const monday = new Date(now);
      monday.setDate(now.getDate() - mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const { data, error } = await supabase
        .from("gamification_points")
        .select("action")
        .eq("user_id", user.id)
        .gte("created_at", monday.toISOString());
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  // ─── Mission Completions ──────────────────────────────
  const missionCompletionsQuery = useQuery({
    queryKey: ["gamification", "mission-completions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("gamification_mission_completions" as any)
        .select("mission_key, period_key")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as unknown as { mission_key: string; period_key: string }[];
    },
    enabled: !!user,
  });

  // ─── Compute Mission Progress ─────────────────────────
  function computeMissionProgress(): MissionProgress[] {
    const todayActions = todayActionsQuery.data || [];
    const weekActions = weekActionsQuery.data || [];
    const completions = missionCompletionsQuery.data || [];
    const today = new Date().toISOString().split("T")[0];
    const weekKey = getWeekKey();
    const monthKey = getStrategicKey();

    return MISSIONS.map((mission) => {
      const periodKey =
        mission.type === "daily" ? today : mission.type === "weekly" ? weekKey : monthKey;
      const alreadyCompleted = completions.some(
        (c) => c.mission_key === mission.key && c.period_key === periodKey
      );
      const actions = mission.type === "daily" ? todayActions : weekActions;
      const progress = mission.requirements.map((req) => {
        const actionParts = req.action.split("|");
        return actions.filter((a) => actionParts.includes(a.action)).length;
      });
      const met = mission.requirements.every((req, i) => progress[i] >= req.count);
      return { mission, progress, completed: alreadyCompleted || met };
    });
  }

  // ─── Complete Mission ─────────────────────────────────
  const completeMission = useCallback(
    async (missionKey: string) => {
      if (!user) return;
      const mission = MISSIONS.find((m) => m.key === missionKey);
      if (!mission) return;
      const today = new Date().toISOString().split("T")[0];
      const periodKey =
        mission.type === "daily" ? today : mission.type === "weekly" ? getWeekKey() : getStrategicKey();

      const { error } = await supabase
        .from("gamification_mission_completions" as any)
        .insert({ user_id: user.id, mission_key: missionKey, period_key: periodKey });
      if (!error) {
        const actionType =
          mission.type === "daily"
            ? "daily_mission_complete"
            : mission.type === "weekly"
            ? "weekly_mission_complete"
            : "strategic_mission_complete";
        await awardPoints(mission.bonusPoints, actionType, missionKey);
        invalidate();
      }
    },
    [user, awardPoints, invalidate]
  );

  // ─── Latest Q&A ───────────────────────────────────────
  const latestQuestionsQuery = useQuery({
    queryKey: ["gamification", "latest-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_questions")
        .select("id, title, category, answers_count, is_resolved, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((q) => q.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);
      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);
      return data.map((q) => ({ ...q, author_name: profileMap.get(q.user_id) || "Agente" }));
    },
    enabled: !!user,
  });

  const myPoints = myPointsQuery.data || 0;

  return {
    awardPoints,
    registerDailyLogin,
    trackSectionVisit,
    myPoints,
    ranking: rankingQuery.data || [],
    weeklyRanking: weeklyRankingQuery.data || [],
    isLoadingRanking: rankingQuery.isLoading,
    vendasRanking: vendasRankingQuery.data || [],
    conteudoRanking: conteudoRankingQuery.data || [],
    educacaoRanking: educacaoRankingQuery.data || [],
    isLoadingCategoryRanking: vendasRankingQuery.isLoading || conteudoRankingQuery.isLoading || educacaoRankingQuery.isLoading,
    latestQuestions: latestQuestionsQuery.data || [],
    isLoadingQuestions: latestQuestionsQuery.isLoading,
    missionsProgress: computeMissionProgress(),
    completeMission,
    level: getLevel(myPoints),
    levelProgress: getLevelProgress(myPoints),
    nextLevel: getNextLevel(myPoints),
    POINTS_CONFIG,
    invalidate,
  };
}
