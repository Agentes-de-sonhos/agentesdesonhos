import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface OnlineAgent {
  user_id: string;
  name: string;
  avatar_url: string | null;
  agency_name: string | null;
  city: string | null;
}

export function usePresence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Heartbeat - update presence every 60s
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      await (supabase as any)
        .from("user_presence")
        .upsert(
          { user_id: user.id, last_active_at: new Date().toISOString() },
          { onConflict: "user_id" }
        );
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    // Set offline on unmount
    return () => {
      clearInterval(interval);
    };
  }, [user]);

  // Query online premium users (active in last 5 min)
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["online-users"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: presenceData, error } = await (supabase as any)
        .from("user_presence")
        .select("user_id, last_active_at")
        .gte("last_active_at", fiveMinAgo);

      if (error) throw error;
      if (!presenceData || presenceData.length === 0) return [];

      const userIds = presenceData.map((p: any) => p.user_id);

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, city")
        .in("user_id", userIds);

      // Get premium subscriptions
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id")
        .in("user_id", userIds)
        .eq("plan", "premium")
        .eq("is_active", true);

      const premiumIds = new Set(subs?.map((s) => s.user_id) || []);

      return (profiles || [])
        .filter((p) => premiumIds.has(p.user_id) && p.user_id !== user?.id)
        .map((p) => ({
          user_id: p.user_id,
          name: p.name || "Agente",
          avatar_url: p.avatar_url,
          agency_name: p.agency_name,
          city: p.city,
        })) as OnlineAgent[];
    },
    refetchInterval: 30000,
    enabled: !!user,
  });

  // Realtime subscription for presence changes
  useEffect(() => {
    const channel = supabase
      .channel("presence-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["online-users"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return { onlineUsers, onlineCount: onlineUsers.length, isLoading };
}
