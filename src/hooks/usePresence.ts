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

  // Optimized: single RPC call replaces 3 separate queries
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["online-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_online_premium_users", {
        _exclude_user_id: user?.id ?? null,
      });
      if (error) throw error;
      return (data ?? []) as OnlineAgent[];
    },
    refetchInterval: 30000,
    staleTime: 25000,
    enabled: !!user,
  });

  return { onlineUsers, onlineCount: onlineUsers.length, isLoading, isOnline, isOnlineLoading, toggleOnline };
}
