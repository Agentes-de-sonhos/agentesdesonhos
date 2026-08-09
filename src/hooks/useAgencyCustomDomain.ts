import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";

/**
 * Primary custom domain (hostname) of the logged-in agency, or null when the
 * agency still uses the generic platform domains.
 */
export function useAgencyCustomDomain() {
  const { agencyOwnerId } = useAgencyOwnerId();

  const { data, isLoading } = useQuery({
    queryKey: ["agency-custom-domain", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_public_domains" as any)
        .select("hostname, is_primary")
        .eq("user_id", agencyOwnerId as string)
        .eq("is_active", true)
        .order("is_primary", { ascending: false })
        .limit(1);
      if (error) return null;
      const row = (data as any[])?.[0];
      return (row?.hostname as string) || null;
    },
  });

  return { customDomain: (data as string | null | undefined) ?? null, isLoading };
}

/**
 * Map of agency owner user_id → primary custom hostname.
 * Only returns rows the current user may read (admins see all).
 */
export function useAgencyDomainsMap() {
  const { data } = useQuery({
    queryKey: ["agency-domains-map"],
    staleTime: 30 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_public_domains" as any)
        .select("hostname, user_id, is_primary")
        .eq("is_active", true)
        .order("is_primary", { ascending: false });
      if (error) return {} as Record<string, string>;
      const map: Record<string, string> = {};
      for (const row of (data as any[]) || []) {
        if (!map[row.user_id]) map[row.user_id] = row.hostname;
      }
      return map;
    },
  });

  return (data as Record<string, string> | undefined) ?? {};
}