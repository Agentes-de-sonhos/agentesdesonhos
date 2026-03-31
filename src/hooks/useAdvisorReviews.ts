import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useEffect } from "react";

export type AdvisorItemType = "hotel" | "attraction" | "experience" | "dining" | "shopping";
export type ReviewType = "recommend" | "not_recommend";

export interface AdvisorReview {
  id: string;
  item_id: string;
  item_type: AdvisorItemType;
  user_id: string;
  review_type: ReviewType;
  comment: string | null;
  created_at: string;
  updated_at: string;
  profile?: { name: string | null; agency_name: string | null; avatar_url: string | null };
}

export interface AdvisorReviewCounts {
  recommend: number;
  not_recommend: number;
}

export function useAdvisorReviews(itemId: string, itemType: AdvisorItemType) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const queryKey = ["advisor-reviews", itemType, itemId];

  const { data: reviews = [], isLoading } = useQuery({
    queryKey,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advisor_reviews")
        .select("*")
        .eq("item_id", itemId)
        .eq("item_type", itemType)
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
      })) as AdvisorReview[];
    },
    enabled: !!itemId,
  });

  // Realtime subscription
  useEffect(() => {
    if (!itemId) return;
    const channel = supabase
      .channel(`advisor-reviews-${itemType}-${itemId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "advisor_reviews",
          filter: `item_id=eq.${itemId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [itemId, itemType, queryClient]);

  const userReview = reviews.find((r) => r.user_id === user?.id) || null;

  const counts: AdvisorReviewCounts = {
    recommend: reviews.filter((r) => r.review_type === "recommend").length,
    not_recommend: reviews.filter((r) => r.review_type === "not_recommend").length,
  };

  const recommendReviews = reviews.filter((r) => r.review_type === "recommend");
  const notRecommendReviews = reviews.filter((r) => r.review_type === "not_recommend");

  const submitReview = useMutation({
    mutationFn: async (data: { review_type: ReviewType; comment?: string }) => {
      if (!user) throw new Error("Não autenticado");

      if (userReview) {
        // Update existing
        const { error } = await supabase
          .from("advisor_reviews")
          .update({
            review_type: data.review_type,
            comment: data.comment || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", userReview.id);
        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from("advisor_reviews")
          .insert({
            item_id: itemId,
            item_type: itemType,
            user_id: user.id,
            review_type: data.review_type,
            comment: data.comment || null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      toast.success(userReview ? "Avaliação atualizada!" : "Avaliação enviada!");
    },
    onError: () => {
      toast.error("Erro ao enviar avaliação");
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId?: string) => {
      if (!user) throw new Error("Não autenticado");
      const targetId = reviewId || userReview?.id;
      if (!targetId) throw new Error("Avaliação não encontrada");
      const { error } = await supabase
        .from("advisor_reviews")
        .delete()
        .eq("id", targetId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
      queryClient.invalidateQueries({ queryKey: ["advisor-review-counts", itemType, itemId] });
      queryClient.invalidateQueries({ queryKey: ["my-advisor-review", itemType, itemId] });
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
    counts,
    recommendReviews,
    notRecommendReviews,
    submitReview,
    deleteReview,
  };
}

// Lightweight hook for counts only (used in cards)
export function useAdvisorReviewCounts(itemId: string, itemType: AdvisorItemType) {
  return useQuery({
    queryKey: ["advisor-review-counts", itemType, itemId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advisor_reviews")
        .select("review_type")
        .eq("item_id", itemId)
        .eq("item_type", itemType);
      if (error) throw error;
      const recommend = (data || []).filter((r: any) => r.review_type === "recommend").length;
      const not_recommend = (data || []).filter((r: any) => r.review_type === "not_recommend").length;
      return { recommend, not_recommend };
    },
    enabled: !!itemId,
  });
}

export function useMyAdvisorReview(itemId: string, itemType: AdvisorItemType) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-advisor-review", itemType, itemId, user?.id],
    enabled: !!user && !!itemId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("advisor_reviews")
        .select("id, review_type")
        .eq("item_id", itemId)
        .eq("item_type", itemType)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}
