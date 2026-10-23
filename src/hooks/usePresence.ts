import { useEffect, useCallback, useSyncExternalStore } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { isSupportSessionForUser } from "@/lib/impersonation";

export interface OnlineAgent {
  user_id: string;
  name: string;
  avatar_url: string | null;
  agency_name: string | null;
  city: string | null;
}

// Chat presence starts OFFLINE every session. While offline we never write
// heartbeats nor poll who is online — the user must opt in ("Ficar online").
let onlineState = false;
const listeners = new Set<() => void>();
const subscribe = (l: () => void) => { listeners.add(l); return () => listeners.delete(l); };
const getSnapshot = () => onlineState;
const setShared = (v: boolean) => { onlineState = v; listeners.forEach((l) => l()); };
const resetDoneFor = new Set<string>();

export function usePresence() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOnline = useSyncExternalStore(subscribe, getSnapshot);
  const blocked = !user || isSupportSessionForUser(user.id);

  // Once per session: if the stored status is still "online" from before, turn it off.
  useEffect(() => {
    if (blocked || resetDoneFor.has(user!.id)) return;
    resetDoneFor.add(user!.id);
    (supabase as any)
      .from("user_presence")
      .update({ is_online: false })
      .eq("user_id", user!.id)
      .eq("is_online", true)
      .then(() => {});
  }, [blocked, user]);

  // Heartbeat only while the user chose to be online.
  useEffect(() => {
    if (blocked || !isOnline) return;
    const updatePresence = () =>
      (supabase as any)
        .from("user_presence")
        .upsert(
          { user_id: user!.id, last_active_at: new Date().toISOString(), is_online: true },
          { onConflict: "user_id" }
        );
    updatePresence();
    const interval = setInterval(updatePresence, 60000);
    return () => clearInterval(interval);
  }, [blocked, user, isOnline]);

  const toggleOnline = useCallback(async (value: boolean) => {
    if (!user || isSupportSessionForUser(user.id)) return;
    setShared(value);
    if (!value) {
      await (supabase as any)
        .from("user_presence")
        .upsert(
          { user_id: user.id, last_active_at: new Date().toISOString(), is_online: false },
          { onConflict: "user_id" }
        );
    }
    queryClient.invalidateQueries({ queryKey: ["online-users"] });
  }, [user, queryClient]);

  // Who is online is only polled while this user is online.
  const { data: onlineUsers = [], isLoading } = useQuery({
    queryKey: ["online-users"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_online_premium_users", {
        _exclude_user_id: user?.id ?? null,
      });
      if (error) throw error;
      return (data ?? []) as OnlineAgent[];
    },
    refetchInterval: isOnline ? 30000 : false,
    staleTime: 25000,
    enabled: !!user && isOnline,
  });

  const visible = isOnline ? onlineUsers : [];
  return { onlineUsers: visible, onlineCount: visible.length, isLoading: isOnline && isLoading, isOnline, isOnlineLoading: false, toggleOnline };
}
