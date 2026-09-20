import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCommunityNetwork } from "@/hooks/useCommunityNetwork";

export interface ConnectionProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  agency_name: string | null;
}

/**
 * Perfis públicos das conexões aceitas — base das marcações @ e do envio de
 * publicações. Nunca expõe e-mail, telefone ou dados privados.
 */
export function useCommunityConnectionProfiles() {
  const { acceptedConnections, currentUserId, isLoading: loadingConnections } = useCommunityNetwork();

  const otherIds = useMemo(
    () =>
      [
        ...new Set(
          acceptedConnections.map((c) =>
            c.requester_id === currentUserId ? c.receiver_id : c.requester_id,
          ),
        ),
      ].filter(Boolean),
    [acceptedConnections, currentUserId],
  );

  const profilesQuery = useQuery({
    queryKey: ["community-connection-profiles", currentUserId, otherIds.join(",")],
    enabled: !!currentUserId && otherIds.length > 0,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", otherIds);
      if (error) throw error;
      return (data ?? []).map((row: any) => ({
        user_id: row.user_id as string,
        name: (row.name as string) || "Agente",
        avatar_url: (row.avatar_url as string | null) ?? null,
        agency_name: (row.agency_name as string | null) ?? null,
      })) as ConnectionProfile[];
    },
  });

  return {
    connectionProfiles: profilesQuery.data ?? [],
    connectionIds: otherIds,
    isLoading: loadingConnections || profilesQuery.isLoading,
    isError: profilesQuery.isError,
  };
}
