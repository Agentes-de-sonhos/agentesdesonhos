import { useEffect, useState } from "react";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import type { Client } from "@/types/crm";

export const CLIENTS_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const CLIENTS_DEFAULT_PAGE_SIZE = 25;

/** Escapes PostgREST `or()` filter special chars. */
function sanitizeSearch(term: string) {
  return term.trim().replace(/[%,()]/g, " ").replace(/\s+/g, " ").trim();
}

interface UseClientsPagedParams {
  search: string;
  status: string; // "all" | ClientStatus
  page: number;
  pageSize: number;
}

export interface ClientsPagedResult {
  clients: Client[];
  total: number;
  totalPages: number;
  isLoading: boolean;
  isFetching: boolean;
  /** true when the agency has no clients at all (regardless of filters) */
  isEmptyAgency: boolean;
}

/** Debounce a value (used for the search input so we don't hit the DB per keystroke). */
export function useDebouncedValue<T>(value: T, delay = 350) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

/**
 * Server-side paginated clients list.
 * No global limit: every row is reachable through `.range()` + `count: 'exact'`.
 * Search and status filters are applied in the database, over the full dataset.
 */
export function useClientsPaged({ search, status, page, pageSize }: UseClientsPagedParams): ClientsPagedResult {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const term = sanitizeSearch(search);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["clients-paged", agencyOwnerId, term, status, page, pageSize],
    enabled: !!user && !!agencyOwnerId,
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;

      let query = supabase
        .from("clients")
        .select("*", { count: "exact" })
        .eq("user_id", agencyOwnerId!);

      if (status !== "all") query = query.eq("status", status);
      if (term) {
        query = query.or(
          `name.ilike.%${term}%,email.ilike.%${term}%,city.ilike.%${term}%,phone.ilike.%${term}%`
        );
      }

      const { data, error, count } = await query
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);

      if (error) throw error;
      return { rows: (data || []) as Client[], count: count ?? 0 };
    },
  });

  // Total client count for the agency, without filters — distinguishes the two empty states.
  const { data: agencyTotal } = useQuery({
    queryKey: ["clients-total", agencyOwnerId],
    enabled: !!user && !!agencyOwnerId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("clients")
        .select("id", { count: "exact", head: true })
        .eq("user_id", agencyOwnerId!);
      if (error) throw error;
      return count ?? 0;
    },
  });

  const total = data?.count ?? 0;

  return {
    clients: data?.rows ?? [],
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    isLoading,
    isFetching,
    isEmptyAgency: (agencyTotal ?? 0) === 0,
  };
}

/** Fetches a single client by id (used for `?client=<id>` deep links). */
export function useClientById(clientId: string | null) {
  return useQuery({
    queryKey: ["client-by-id", clientId],
    enabled: !!clientId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clients")
        .select("*")
        .eq("id", clientId!)
        .maybeSingle();
      if (error) throw error;
      return (data as Client) ?? null;
    },
  });
}

/**
 * Lightweight id+phone map for duplicate detection on contact import.
 * Only fetched when the import dialog is open. Paged internally so there is no cap.
 */
export function useClientPhoneIndex(enabled: boolean) {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();

  return useQuery({
    queryKey: ["clients-phone-index", agencyOwnerId],
    enabled: enabled && !!user && !!agencyOwnerId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const map = new Map<string, string>();
      const chunk = 1000;
      for (let from = 0; ; from += chunk) {
        const { data, error } = await supabase
          .from("clients")
          .select("id, phone")
          .eq("user_id", agencyOwnerId!)
          .not("phone", "is", null)
          .order("id", { ascending: true })
          .range(from, from + chunk - 1);
        if (error) throw error;
        const rows = data || [];
        rows.forEach((c) => {
          const digits = (c.phone || "").replace(/\D/g, "");
          if (!digits) return;
          const normalized = digits.length >= 10 && !digits.startsWith("55") ? "55" + digits : digits;
          map.set(normalized, c.id);
        });
        if (rows.length < chunk) break;
      }
      return map;
    },
  });
}