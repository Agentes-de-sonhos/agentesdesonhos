import { useCallback, useEffect, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const key = (userId: string) => `community:lastSeenAt:${userId}`;

function readLastSeen(userId?: string): string | null {
  if (!userId || typeof window === "undefined") return null;
  return window.localStorage.getItem(key(userId));
}

/**
 * Counts new community posts + comments created after the user's last
 * registered visit to the Community page (own content excluded).
 */
export function useCommunityUnread(enabled = true) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const lastSeen = useMemo(() => readLastSeen(user?.id), [user?.id]);

  // First run: register "now" so the badge never shows a historical backlog.
  useEffect(() => {
    if (user?.id && !readLastSeen(user.id)) {
      window.localStorage.setItem(key(user.id), new Date().toISOString());
      queryClient.invalidateQueries({ queryKey: ["community-unread"] });
    }
  }, [user?.id, queryClient]);

  const { data: newCount = 0 } = useQuery({
    queryKey: ["community-unread", user?.id, lastSeen],
    queryFn: async () => {
      if (!user?.id || !lastSeen) return 0;
      const [posts, comments] = await Promise.all([
        supabase
          .from("community_posts")
          .select("id", { count: "exact", head: true })
          .gt("created_at", lastSeen)
          .neq("user_id", user.id),
        supabase
          .from("community_post_comments")
          .select("id", { count: "exact", head: true })
          .gt("created_at", lastSeen)
          .neq("user_id", user.id),
      ]);
      return (posts.count ?? 0) + (comments.count ?? 0);
    },
    enabled: enabled && !!user?.id && !!lastSeen,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const markSeen = useCallback(() => {
    if (!user?.id) return;
    window.localStorage.setItem(key(user.id), new Date().toISOString());
    queryClient.invalidateQueries({ queryKey: ["community-unread"] });
  }, [user?.id, queryClient]);

  return { newCount, markSeen };
}

export function unreadLabel(count: number) {
  return count === 1 ? "1 mensagem nova" : `${count} mensagens novas`;
}
