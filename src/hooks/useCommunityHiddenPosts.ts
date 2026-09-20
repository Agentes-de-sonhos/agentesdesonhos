import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const COMMUNITY_HIDDEN_POSTS_KEY = "community-hidden-posts";

/** Ids únicos das publicações ocultadas por este usuário. */
export function hiddenPostIds(rows: { post_id: string }[] | undefined | null): string[] {
  return [...new Set((rows ?? []).map((row) => row.post_id))];
}

/**
 * Ocultar publicação é uma preferência por usuário: a publicação não é excluída e
 * continua visível aos demais, ao autor e aos administradores.
 */
export function useCommunityHiddenPosts() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const hiddenQuery = useQuery({
    queryKey: [COMMUNITY_HIDDEN_POSTS_KEY, userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_hidden_posts")
        .select("post_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as { post_id: string }[];
    },
  });

  const hiddenIds = useMemo(() => hiddenPostIds(hiddenQuery.data), [hiddenQuery.data]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: [COMMUNITY_HIDDEN_POSTS_KEY] });
    queryClient.invalidateQueries({ queryKey: ["community-feed"] });
    queryClient.invalidateQueries({ queryKey: ["community-search-posts"] });
  };

  const unhide = useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) throw new Error("Não autenticado");
      const { error } = await (supabase as any)
        .from("community_hidden_posts")
        .delete()
        .eq("user_id", userId)
        .eq("post_id", postId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Publicação restaurada no seu feed");
    },
    onError: () => toast.error("Não foi possível restaurar a publicação"),
  });

  const hide = useMutation({
    mutationFn: async (postId: string) => {
      if (!userId) throw new Error("Não autenticado");
      const { error } = await (supabase as any)
        .from("community_hidden_posts")
        .insert({ user_id: userId, post_id: postId });
      if (error) throw error;
    },
    onSuccess: (_data, postId) => {
      invalidate();
      toast.success("Publicação oculta do seu feed", {
        action: {
          label: "Desfazer",
          onClick: () => unhide.mutate(postId),
        },
      });
    },
    onError: () => toast.error("Não foi possível ocultar a publicação"),
  });

  const isHidden = useCallback((postId: string) => hiddenIds.includes(postId), [hiddenIds]);

  return {
    hiddenIds,
    isHidden,
    isLoading: hiddenQuery.isLoading,
    isReady: !userId || !hiddenQuery.isLoading,
    hidePost: hide.mutate,
    unhidePost: unhide.mutate,
    isUpdating: hide.isPending || unhide.isPending,
  };
}
