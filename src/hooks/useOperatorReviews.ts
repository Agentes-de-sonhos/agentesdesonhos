import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface OperatorReview {
  id: string;
  operator_id: string;
  user_id: string;
  rating: number;
  reaction: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: { name: string | null; agency_name: string | null; avatar_url: string | null };
}

export function useOperatorReviews(operatorId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["operator-reviews", operatorId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operator_reviews")
        .select("*")
        .eq("operator_id", operatorId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch profiles for review authors
      const userIds = [...new Set((data || []).map((r) => r.user_id))];
      let profilesMap: Record<string, { name: string | null; agency_name: string | null; avatar_url: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, agency_name, avatar_url")
          .in("user_id", userIds);
        if (profiles) {
          profiles.forEach((p) => {
            profilesMap[p.user_id] = { name: p.name, agency_name: p.agency_name, avatar_url: p.avatar_url };
          });
        }
      }

      return (data || []).map((r) => ({
        ...r,
        profile: profilesMap[r.user_id] || { name: null, agency_name: null, avatar_url: null },
      })) as OperatorReview[];
    },
    enabled: !!operatorId,
  });

  const userReview = reviews.find((r) => r.user_id === user?.id) || null;

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : 0;

  const submitReview = useMutation({
    mutationFn: async (data: { rating: number; reaction?: string; comment?: string }) => {
      if (!user) throw new Error("Não autenticado");

      if (userReview) {
        const { error } = await supabase
          .from("operator_reviews")
          .update({
            rating: data.rating,
            reaction: data.reaction || null,
            comment: data.comment || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userReview.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("operator_reviews")
          .insert({
            operator_id: operatorId,
            user_id: user.id,
            rating: data.rating,
            reaction: data.reaction || null,
            comment: data.comment || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["operator-reviews", operatorId] });
      toast.success(userReview ? "Avaliação atualizada!" : "Avaliação enviada!");
    },
    onError: () => {
      toast.error("Erro ao enviar avaliação");
    },
  });

  return {
    reviews,
    isLoading,
    userReview,
    averageRating,
    totalReviews: reviews.length,
    submitReview,
  };
}
