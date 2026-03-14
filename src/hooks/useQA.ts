import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useGamification } from "./useGamification";
import { toast } from "sonner";

export interface QAQuestion {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  category: string;
  is_resolved: boolean;
  answers_count: number;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
}

export interface QAAnswer {
  id: string;
  question_id: string;
  user_id: string;
  content: string;
  is_best_answer: boolean;
  created_at: string;
  updated_at: string;
  author_name?: string;
  author_avatar?: string;
}

export const QA_CATEGORIES = [
  { value: "companhia_aerea", label: "Companhia Aérea" },
  { value: "consolidadora", label: "Consolidadora" },
  { value: "cruzeiro", label: "Cruzeiro" },
  { value: "destino", label: "Destino" },
  { value: "geral", label: "Geral" },
  { value: "guia", label: "Guia de Turismo" },
  { value: "hotel", label: "Hotel" },
  { value: "locadora_carro", label: "Locadora de Carro" },
  { value: "operadora", label: "Operadora" },
  { value: "receptivo", label: "Receptivo" },
  { value: "seguro_viagem", label: "Seguro Viagem" },
  { value: "transfer", label: "Transfer" },
];

export function useQA() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { awardPoints } = useGamification();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const questionsQuery = useQuery({
    queryKey: ["qa-questions", selectedCategory],
    queryFn: async () => {
      let query = supabase
        .from("qa_questions")
        .select("*")
        .order("created_at", { ascending: false });

      if (selectedCategory) {
        query = query.eq("category", selectedCategory);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch author profiles
      const userIds = [...new Set((data || []).map((q: any) => q.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

      return (data || []).map((q: any) => ({
        ...q,
        author_name: profileMap.get(q.user_id)?.name || "Usuário",
        author_avatar: profileMap.get(q.user_id)?.avatar_url,
      })) as QAQuestion[];
    },
    enabled: !!user,
  });

  const answersQuery = useCallback(
    (questionId: string) => ({
      queryKey: ["qa-answers", questionId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("qa_answers")
          .select("*")
          .eq("question_id", questionId)
          .order("is_best_answer", { ascending: false })
          .order("created_at", { ascending: true });

        if (error) throw error;

        const userIds = [...new Set((data || []).map((a: any) => a.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        return (data || []).map((a: any) => ({
          ...a,
          author_name: profileMap.get(a.user_id)?.name || "Usuário",
          author_avatar: profileMap.get(a.user_id)?.avatar_url,
        })) as QAAnswer[];
      },
      enabled: !!user,
    }),
    [user]
  );

  const createQuestion = useMutation({
    mutationFn: async (data: { title: string; description?: string; category: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { data: result, error } = await supabase
        .from("qa_questions")
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      // Award 0.25 points for asking a question
      await awardPoints(0.25, "ask_question", result.id);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["qa-questions"] });
      toast.success("Pergunta publicada! +0.25 pontos");
    },
    onError: () => toast.error("Erro ao publicar pergunta"),
  });

  const createAnswer = useMutation({
    mutationFn: async (data: { question_id: string; content: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { data: result, error } = await supabase
        .from("qa_answers")
        .insert({ ...data, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      // Award 4 points for answering
      await awardPoints(4, "answer_question", result.id);
      return result;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["qa-answers", vars.question_id] });
      queryClient.invalidateQueries({ queryKey: ["qa-questions"] });
      toast.success("Resposta publicada! +4 pontos");
    },
    onError: () => toast.error("Erro ao publicar resposta"),
  });

  const markBestAnswer = useMutation({
    mutationFn: async ({ answerId, questionId }: { answerId: string; questionId: string }) => {
      // Unmark all other best answers for this question
      await supabase
        .from("qa_answers")
        .update({ is_best_answer: false })
        .eq("question_id", questionId);

      const { error } = await supabase
        .from("qa_answers")
        .update({ is_best_answer: true })
        .eq("id", answerId);
      if (error) throw error;

      // Mark question as resolved
      await supabase
        .from("qa_questions")
        .update({ is_resolved: true })
        .eq("id", questionId);
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["qa-answers", vars.questionId] });
      queryClient.invalidateQueries({ queryKey: ["qa-questions"] });
      toast.success("Melhor resposta marcada!");
    },
  });

  const toggleAnswerLike = useMutation({
    mutationFn: async ({ answerId, questionId }: { answerId: string; questionId: string }) => {
      if (!user) throw new Error("Não autenticado");
      // Check if already liked
      const { data: existing } = await supabase
        .from("qa_answer_likes")
        .select("id")
        .eq("answer_id", answerId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existing) {
        await supabase.from("qa_answer_likes").delete().eq("id", existing.id);
        return { liked: false };
      } else {
        await supabase.from("qa_answer_likes").insert({ answer_id: answerId, user_id: user.id });
        return { liked: true };
      }
    },
    onSuccess: (result, vars) => {
      queryClient.invalidateQueries({ queryKey: ["qa-answers", vars.questionId] });
      queryClient.invalidateQueries({ queryKey: ["qa-answer-likes"] });
      if (result?.liked) toast.success("Curtida registrada! 👍");
    },
    onError: () => toast.error("Erro ao curtir"),
  });

  return {
    questions: questionsQuery.data || [],
    isLoading: questionsQuery.isLoading,
    selectedCategory,
    setSelectedCategory,
    createQuestion,
    createAnswer,
    markBestAnswer,
    toggleAnswerLike,
    getAnswersQuery: answersQuery,
  };
}
