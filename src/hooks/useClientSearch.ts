import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useDebounce } from "@/hooks/useDebounce";
import type { Client } from "@/types/crm";

const PAGE_SIZE = 20;

/** Escapes PostgREST `or()` filter special chars. */
function sanitizeSearch(term: string) {
  return term.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
}

/** Digits-only variant, so phone search works regardless of formatting typed. */
function digitsOnly(term: string) {
  return term.replace(/\D/g, "");
}

export interface ClientSearchResult {
  clients: Client[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  /** true once the query settled (used to only show "no results" after loading) */
  isSettled: boolean;
}

/**
 * Server-side autocomplete for clients, scoped to the agency owner (RLS-safe).
 * Searches the WHOLE table (name / email / phone / city), never loads everything
 * into the browser: each query returns at most `limit` rows.
 */
export function useClientSearch(search: string, enabled = true, limit = PAGE_SIZE): ClientSearchResult {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const debounced = useDebounce(search, 300);
  const term = sanitizeSearch(debounced);

  const { data, isLoading, isFetching, isSuccess } = useQuery({
    queryKey: ["clients-search", agencyOwnerId, term, limit],
    enabled: enabled && !!user && !!agencyOwnerId,
    placeholderData: keepPreviousData,
    staleTime: 30 * 1000,
    queryFn: async () => {
      let query = supabase
        .from("clients")
        .select("*")
        .eq("user_id", agencyOwnerId!);

      if (term) {
        const digits = digitsOnly(term);
        const filters = [
          `name.ilike.%${term}%`,
          `email.ilike.%${term}%`,
          `phone.ilike.%${term}%`,
          `city.ilike.%${term}%`,
        ];
        if (digits.length >= 3) filters.push(`phone.ilike.%${digits}%`);
        query = query.or(filters.join(","));
      }

      const { data, error } = await query
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(0, limit); // one extra row to detect "has more"

      if (error) throw error;
      const rows = (data || []) as Client[];
      return { rows: rows.slice(0, limit), hasMore: rows.length > limit };
    },
  });

  return {
    clients: data?.rows ?? [],
    isLoading,
    isFetching,
    hasMore: data?.hasMore ?? false,
    isSettled: isSuccess && !isFetching,
  };
}
