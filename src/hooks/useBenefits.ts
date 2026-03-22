import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { Benefit, BenefitComment } from "@/types/benefits";

export function useBenefits() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: benefits = [], isLoading } = useQuery({
    queryKey: ["benefits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("benefits")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data as any[]).map((b) => b.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);

      return (data as any[]).map((b) => ({
        ...b,
        tags: b.tags || [],
        profile: profiles?.find((p) => p.user_id === b.user_id),
      })) as Benefit[];
    },
    staleTime: 3 * 60 * 1000,
  });

  const { data: userConfirmations = [] } = useQuery({
    queryKey: ["benefit-confirmations", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("benefit_confirmations")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createBenefit = useMutation({
    mutationFn: async (benefit: {
      company_name: string;
      title: string;
      short_description?: string;
      full_description?: string;
      destination?: string;
      category: string;
      tags?: string[];
      requirements?: string;
      how_to_claim?: string;
      official_link?: string;
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("benefits").insert({
        ...benefit,
        user_id: user.id,
        tags: benefit.tags || [],
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Benefício compartilhado com sucesso! 🎉");
      queryClient.invalidateQueries({ queryKey: ["benefits"] });
    },
    onError: () => toast.error("Erro ao compartilhar benefício"),
  });

  const confirmBenefit = useMutation({
    mutationFn: async ({ benefitId, type }: { benefitId: string; type: "works" | "not_available" }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const existing = userConfirmations.find((c) => c.benefit_id === benefitId);
      if (existing) {
        await supabase.from("benefit_confirmations").delete().eq("id", existing.id);
        if (existing.confirmation_type === type) return;
      }
      const { error } = await supabase.from("benefit_confirmations").insert({
        benefit_id: benefitId,
        user_id: user.id,
        confirmation_type: type,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["benefits"] });
      queryClient.invalidateQueries({ queryKey: ["benefit-confirmations"] });
    },
  });

  const useComments = (benefitId: string | null) =>
    useQuery({
      enabled: !!benefitId,
      queryKey: ["benefit-comments", benefitId],
      queryFn: async () => {
        const { data, error } = await supabase
          .from("benefit_comments")
          .select("*")
          .eq("benefit_id", benefitId!)
          .order("created_at", { ascending: true });
        if (error) throw error;

        const userIds = [...new Set((data as any[]).map((c) => c.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);

        return (data as any[]).map((c) => ({
          ...c,
          profile: profiles?.find((p) => p.user_id === c.user_id),
        })) as BenefitComment[];
      },
    });

  const addComment = useMutation({
    mutationFn: async ({ benefitId, content }: { benefitId: string; content: string }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("benefit_comments").insert({
        benefit_id: benefitId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      toast.success("Comentário adicionado!");
      queryClient.invalidateQueries({ queryKey: ["benefit-comments", vars.benefitId] });
    },
    onError: () => toast.error("Erro ao adicionar comentário"),
  });

  // Ranking of top contributors
  const contributorRanking = benefits.reduce<Record<string, { name: string; avatar_url: string | null; count: number }>>((acc, b) => {
    const key = b.user_id;
    if (!acc[key]) {
      acc[key] = { name: b.profile?.name || "Usuário", avatar_url: b.profile?.avatar_url || null, count: 0 };
    }
    acc[key].count++;
    return acc;
  }, {});

  const ranking = Object.entries(contributorRanking)
    .map(([userId, data]) => ({ userId, ...data }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    benefits,
    isLoading,
    userConfirmations,
    createBenefit: createBenefit.mutate,
    isCreating: createBenefit.isPending,
    confirmBenefit: confirmBenefit.mutate,
    useComments,
    addComment: addComment.mutate,
    isAddingComment: addComment.isPending,
    ranking,
  };
}
