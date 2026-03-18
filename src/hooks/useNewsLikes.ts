import { useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export function useNewsLikes(noticiaIds: string[]) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch counts for all visible news
  const countsQuery = useQuery({
    queryKey: ["news-likes-counts", noticiaIds],
    queryFn: async () => {
      if (noticiaIds.length === 0) return {};
      const { data, error } = await supabase
        .from("news_likes")
        .select("noticia_id")
        .in("noticia_id", noticiaIds);
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((row: any) => {
        counts[row.noticia_id] = (counts[row.noticia_id] || 0) + 1;
      });
      return counts;
    },
    enabled: noticiaIds.length > 0,
  });

  // Fetch which ones current user liked
  const myLikesQuery = useQuery({
    queryKey: ["news-likes-mine", user?.id, noticiaIds],
    queryFn: async () => {
      if (!user || noticiaIds.length === 0) return new Set<string>();
      const { data, error } = await supabase
        .from("news_likes")
        .select("noticia_id")
        .eq("user_id", user.id)
        .in("noticia_id", noticiaIds);
      if (error) throw error;
      return new Set((data || []).map((r: any) => r.noticia_id));
    },
    enabled: !!user && noticiaIds.length > 0,
  });

  const toggleLike = useMutation({
    mutationFn: async (noticiaId: string) => {
      if (!user) throw new Error("Not authenticated");
      const liked = myLikesQuery.data?.has(noticiaId);
      if (liked) {
        const { error } = await supabase
          .from("news_likes")
          .delete()
          .eq("noticia_id", noticiaId)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("news_likes")
          .insert({ noticia_id: noticiaId, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["news-likes-counts"] });
      queryClient.invalidateQueries({ queryKey: ["news-likes-mine"] });
    },
  });

  const getLikeCount = useCallback(
    (id: string) => countsQuery.data?.[id] || 0,
    [countsQuery.data]
  );

  const isLiked = useCallback(
    (id: string) => myLikesQuery.data?.has(id) || false,
    [myLikesQuery.data]
  );

  return { getLikeCount, isLiked, toggleLike: toggleLike.mutate };
}
