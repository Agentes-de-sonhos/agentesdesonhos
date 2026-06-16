import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Returns the agency owner (master) user_id for the current user.
 * - Master: returns their own auth.uid().
 * - Collaborator (team member impersonating master via Edge Functions): also their auth.uid()
 *   when no agency_membership row exists for them — the master is themselves.
 * - Real collaborator (separate auth user linked via agency_membership): returns master's id.
 *
 * Fallback: if no row in agency_membership and no error, returns user.id (treats as master).
 * This guarantees we never return null while logged in, avoiding empty queries on first login.
 */
export function useAgencyOwnerId() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["agency-owner-id", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("agency_membership")
        .select("agency_id")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) {
        // RLS denial or transient error — fall back to self as master.
        return user.id;
      }
      return (data?.agency_id as string) || user.id;
    },
  });

  return {
    agencyOwnerId: (data as string | null | undefined) ?? user?.id ?? null,
    isLoading,
  };
}