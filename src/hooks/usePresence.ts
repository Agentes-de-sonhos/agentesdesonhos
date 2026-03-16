import { useEffect, useState, useCallback } from "react";
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
  const [isOnline, setIsOnlineState] = useState(true);
  const [isOnlineLoading, setIsOnlineLoading] = useState(true);

  // Load initial is_online state from DB
  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("user_presence")
        .select("is_online")
        .eq("user_id", user.id)
        .maybeSingle();
      setIsOnlineState(data?.is_online ?? true);
      setIsOnlineLoading(false);
    })();
  }, [user]);

  // Heartbeat - update presence every 60s
  useEffect(() => {
    if (!user) return;

    const updatePresence = async () => {
      await (supabase as any)
        .from("user_presence")
        .upsert(
          { user_id: user.id, last_active_at: new Date().toISOString(), is_online: isOnline },
          { onConflict: "user_id" }
        );
    };

    updatePresence();
    const interval = setInterval(updatePresence, 60000);

    return () => {
      clearInterval(interval);
    };
  }, [user, isOnline]);

  const toggleOnline = useCallback(async (value: boolean) => {
    if (!user) return;
    setIsOnlineState(value);
    await (supabase as any)
      .from("user_presence")
      .upsert(
        { user_id: user.id, last_active_at: new Date().toISOString(), is_online: value },
        { onConflict: "user_id" }
      );
    queryClient.invalidateQueries({ queryKey: ["online-users"] });
  }, [user, queryClient]);

  // Query online premium users (active in last 5 min AND is_online = true)
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["online-users"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

      const { data: presenceData, error } = await (supabase as any)
        .from("user_presence")
        .select("user_id, last_active_at")
        .gte("last_active_at", fiveMinAgo)
        .eq("is_online", true);

      if (error) throw error;
      if (!presenceData || presenceData.length === 0) return [];

      const userIds = presenceData.map((p: any) => p.user_id);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, city")
        .in("user_id", userIds);

      const { data: subs } = await supabase
        .from("subscriptions")
        .select("user_id")
        .in("user_id", userIds)
        .eq("plan", "profissional")
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

  return { onlineUsers, onlineCount: onlineUsers.length, isLoading, isOnline, isOnlineLoading, toggleOnline };
}
