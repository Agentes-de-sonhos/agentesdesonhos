/**
 * Lista os orçamentos da própria agência disponíveis para importação no CRM.
 * O filtro por `user_id` do titular, somado ao RLS, garante o isolamento entre
 * agências/tenants — nenhum orçamento de terceiros é listado ou vinculado.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import type { ImportableQuote } from "@/lib/crmQuoteImport";

export const IMPORTABLE_QUOTE_COLUMNS =
  "id, trip_title, destination, client_name, client_id, start_date, end_date, adults_count, children_count, total_amount, opportunity_id, created_at, status, public_access_code";

export function useImportableQuotes(enabled = true) {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();

  const { data: quotes = [], isLoading, error, refetch } = useQuery({
    queryKey: ["importable-quotes", agencyOwnerId, user?.id],
    enabled: enabled && !!user?.id && !!agencyOwnerId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error: err } = await supabase
        .from("quotes")
        .select(IMPORTABLE_QUOTE_COLUMNS)
        .eq("user_id", agencyOwnerId as string)
        .order("created_at", { ascending: false })
        .limit(300);
      if (err) throw err;
      return (data || []) as unknown as ImportableQuote[];
    },
  });

  return { quotes, isLoading, error: error as Error | null, refetch };
}
