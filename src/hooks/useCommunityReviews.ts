import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  normalizeReviewPayload,
  reviewErrorMessage,
  reviewTargetKey,
  type ReviewCommentStatus,
} from "@/lib/communityReviews";

export interface CommunityReview {
  id: string;
  supplier_source: string;
  supplier_id: string;
  /** NULL para autores de terceiros (minimização de dados). */
  user_id: string | null;
  rating: number;
  comment: string | null;
  comment_status: ReviewCommentStatus;
  moderation_reason: string | null;
  is_mine: boolean;
  created_at: string;
  updated_at: string;
  author_name: string | null;
  author_avatar_url: string | null;
  author_agency_name: string | null;
}

export interface ReviewStats {
  count: number;
  average: number;
}

export const REVIEW_STATS_QUERY_KEY = ["supplier-community-review-stats"];

/** Agregados (média + total) de todos os fornecedores, por source:id. */
export function useSupplierReviewStatsMap() {
  const { user } = useAuth();
  return useQuery({
    queryKey: REVIEW_STATS_QUERY_KEY,
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_supplier_review_stats");
      if (error) throw error;
      const map: Record<string, ReviewStats> = {};
      for (const row of data || []) {
        map[reviewTargetKey(row.supplier_source, row.supplier_id)] = {
          count: row.review_count ?? 0,
          average: Number(row.average_rating ?? 0),
        };
      }
      return map;
    },
  });
}

/**
 * Elegibilidade: autenticado + e-mail confirmado + nome e foto no perfil +
 * vínculo de agência + assinatura ativa (validado no servidor).
 */
export function useReviewEligibility() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["supplier-review-eligibility", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("supplier_review_eligibility");
      if (error) throw error;
      const result = (data || {}) as { eligible?: boolean; reason?: string };
      return { eligible: !!result.eligible, reason: result.reason || "unauthenticated" };
    },
  });
}

/** Avaliações de um fornecedor específico + mutações via RPCs autenticadas. */
export function useCommunityReviews(source: string, supplierId: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const enabled = !!user && !!source && !!supplierId;

  const listKey = ["supplier-community-reviews", source, supplierId];

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: listKey,
    enabled,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_supplier_reviews", {
        _source: source,
        _supplier_id: supplierId,
        _limit: 200,
        _offset: 0,
      });
      if (error) throw error;
      return (data || []) as CommunityReview[];
    },
  });

  const myReview = reviews.find((r) => r.is_mine) || null;
  const count = reviews.length;
  const average = count > 0 ? reviews.reduce((sum, r) => sum + r.rating, 0) / count : 0;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: listKey });
    queryClient.invalidateQueries({ queryKey: REVIEW_STATS_QUERY_KEY });
  };

  const submitReview = useMutation({
    mutationFn: async (input: { rating: number; comment?: string | null }) => {
      const payload = normalizeReviewPayload(input.rating, input.comment);
      const { data, error } = await supabase.rpc("submit_supplier_review", {
        _source: source,
        _supplier_id: supplierId,
        _rating: payload.rating,
        _comment: payload.comment,
      });
      if (error) throw error;
      return data as { id: string; comment_status: ReviewCommentStatus };
    },
    onSuccess: (result) => {
      invalidate();
      if (result?.comment_status === "pending") {
        toast.success("Nota publicada! Seu comentário está em análise.");
      } else {
        toast.success("Avaliação registrada!");
      }
    },
    onError: (error: unknown) => {
      toast.error(reviewErrorMessage((error as { message?: string })?.message));
    },
  });

  const deleteReview = useMutation({
    mutationFn: async (reviewId: string) => {
      const { error } = await supabase.rpc("delete_my_supplier_review", { _review_id: reviewId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Avaliação excluída");
    },
    onError: (error: unknown) => {
      toast.error(reviewErrorMessage((error as { message?: string })?.message));
    },
  });

  const reportReview = useMutation({
    mutationFn: async (input: { reviewId: string; reason: string; details?: string | null }) => {
      const { error } = await supabase.rpc("report_supplier_review", {
        _review_id: input.reviewId,
        _reason: input.reason,
        _details: input.details || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Denúncia enviada para análise");
    },
    onError: (error: unknown) => {
      toast.error(reviewErrorMessage((error as { message?: string })?.message));
    },
  });

  return {
    reviews,
    isLoading,
    myReview,
    count,
    average,
    submitReview,
    deleteReview,
    reportReview,
  };
}