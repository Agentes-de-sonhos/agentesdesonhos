import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export type CommunityNotificationType = "mention" | "share" | string;

export interface CommunityNotificationItem {
  id: string;
  type: CommunityNotificationType;
  post_id: string | null;
  comment_id: string | null;
  actor_id: string | null;
  actor_name: string | null;
  created_at: string;
  read_at: string | null;
}

/** Notificações internas da Comunidade (menções e compartilhamentos). */
export function useCommunityNotifications() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["community-notifications", user?.id],
    enabled: !!user?.id,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<CommunityNotificationItem[]> => {
      const { data, error } = await (supabase as any)
        .from("community_notifications")
        .select("id, type, post_id, comment_id, actor_id, created_at, read_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;

      const rows = (data || []) as CommunityNotificationItem[];
      const actorIds = Array.from(
        new Set(rows.map((row) => row.actor_id).filter((id): id is string => !!id))
      );

      let names = new Map<string, string>();
      if (actorIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, name")
          .in("id", actorIds);
        names = new Map((profiles || []).map((p: any) => [p.id as string, (p.name as string) || ""]));
      }

      return rows.map((row) => ({
        ...row,
        actor_name: row.actor_id ? names.get(row.actor_id) || null : null,
      }));
    },
  });
}

export function useMarkCommunityNotificationsRead() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ids?: string[]) => {
      if (!user?.id) return;
      let query = (supabase as any)
        .from("community_notifications")
        .update({ read_at: new Date().toISOString() })
        .is("read_at", null);
      if (ids && ids.length > 0) query = query.in("id", ids);
      const { error } = await query;
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["community-notifications"] });
    },
  });
}
