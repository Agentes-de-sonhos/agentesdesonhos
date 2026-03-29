import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface CruiseReview {
  id: string;
  cruise_id: string;
  user_id: string;
  rating: number;
  reaction: string | null;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: { name: string | null; agency_name: string | null; avatar_url: string | null };
}

export function useCruiseReviews(cruiseId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["cruise-reviews", cruiseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cruise_reviews")
        .select("*")
        .eq("cruise_id", cruiseId)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
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

      return (data || []).map((r: any) => ({
        ...r,
        profile: profilesMap[r.user_id] || { name: null, agency_name: null, avatar_url: null },
      })) as CruiseReview[];
    },
    enabled: !!cruiseId,
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
          .from("cruise_reviews")
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
          .from("cruise_reviews")
          .insert({
            cruise_id: cruiseId,
            user_id: user.id,
            rating: data.rating,
            reaction: data.reaction || null,
            comment: data.comment || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cruise-reviews", cruiseId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-review-stats-all"] });
      toast.success(userReview ? "Avaliação atualizada!" : "Avaliação enviada!");
    },
    onError: () => {
      toast.error("Erro ao enviar avaliação");
    },
  });

  const deleteReview = useMutation({
    mutationFn: async ({ reviewId, reason }: { reviewId: string; reason?: string }) => {
      if (!user) throw new Error("Não autenticado");

      const review = reviews.find((r) => r.id === reviewId);
      if (!review) throw new Error("Avaliação não encontrada");

      await supabase
        .from("cruise_review_moderation_log")
        .insert({
          review_id: review.id,
          cruise_id: review.cruise_id,
          reviewer_user_id: review.user_id,
          rating: review.rating,
          reaction: review.reaction,
          comment: review.comment,
          reason: reason || null,
          moderated_by: user.id,
        });

      const { error } = await supabase
        .from("cruise_reviews")
        .delete()
        .eq("id", reviewId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cruise-reviews", cruiseId] });
      queryClient.invalidateQueries({ queryKey: ["supplier-review-stats-all"] });
      toast.success("Avaliação removida");
    },
    onError: () => {
      toast.error("Erro ao remover avaliação");
    },
  });

  return {
    reviews,
    isLoading,
    userReview,
    averageRating,
    totalReviews: reviews.length,
    submitReview,
    deleteReview,
  };
}
