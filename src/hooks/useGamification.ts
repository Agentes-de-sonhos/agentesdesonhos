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

// Points configuration
export const POINTS_CONFIG = {
  daily_login: 1,
  ask_question: 0.25,
  answer_question: 4,
  useful_vote_received: 5,
  best_answer: 10,
  menu_visit: 0.25,
  earn_certificate: 10,
} as const;

// Menu sections that earn points
export const TRACKABLE_SECTIONS: Record<string, string> = {
  "/mapa-turismo": "Mapa do Turismo",
  "/educa-academy": "EducaTravel Academy",
  "/bloqueios-aereos": "Bloqueios Aéreos",
  "/materiais": "Materiais",
  "/noticias": "Notícias",
  "/agenda": "Agenda",
  "/bloco-notas": "Bloco de Notas",
  "/gestao-clientes": "Gestão de Clientes",
  "/ferramentas-ia": "Ferramentas IA",
  "/comunidade": "Comunidade",
  "/mentorias": "Mentorias",
  "/perguntas-respostas": "Perguntas e Respostas",
  "/financeiro": "Financeiro",
  "/calculadora": "Calculadora",
  "/hotel-advisor": "Hotel Advisor",
};

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
      await awardPoints(POINTS_CONFIG.daily_login, "daily_login");
    }
  }, [user, awardPoints]);

  const trackSectionVisit = useCallback(
    async (sectionKey: string) => {
      if (!user) return;
      // Normalize: match the base path
      const baseKey = Object.keys(TRACKABLE_SECTIONS).find((k) =>
        sectionKey.startsWith(k)
      );
      if (!baseKey) return;

      const today = new Date().toISOString().split("T")[0];

      // Try insert (unique constraint will prevent duplicates)
      const { error } = await supabase
        .from("gamification_daily_visits" as any)
        .insert({
          user_id: user.id,
          visit_date: today,
          section_key: baseKey,
        });

      // If no error (not a duplicate), award points
      if (!error) {
        await awardPoints(POINTS_CONFIG.menu_visit, "menu_visit", undefined);
      }
    },
    [user, awardPoints]
  );

  const awardCertificatePoints = useCallback(
    async (trailId: string) => {
      if (!user) return;
      await awardPoints(POINTS_CONFIG.earn_certificate, "earn_certificate", trailId);
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

  // Latest 5 Q&A questions for dashboard
  const latestQuestionsQuery = useQuery({
    queryKey: ["gamification", "latest-questions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qa_questions")
        .select("id, title, category, answers_count, is_resolved, created_at, user_id")
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;

      // Get author names
      if (!data || data.length === 0) return [];
      const userIds = [...new Set(data.map((q) => q.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name")
        .in("user_id", userIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p.name]) || []);
      return data.map((q) => ({
        ...q,
        author_name: profileMap.get(q.user_id) || "Agente",
      }));
    },
    enabled: !!user,
  });

  return {
    awardPoints,
    registerDailyLogin,
    trackSectionVisit,
    awardCertificatePoints,
    myPoints: myPointsQuery.data || 0,
    ranking: rankingQuery.data || [],
    isLoadingRanking: rankingQuery.isLoading,
    latestQuestions: latestQuestionsQuery.data || [],
    isLoadingQuestions: latestQuestionsQuery.isLoading,
    POINTS_CONFIG,
  };
}
