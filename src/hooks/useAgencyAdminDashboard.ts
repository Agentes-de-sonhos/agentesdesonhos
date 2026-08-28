import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/**
 * Dashboard operacional do painel white label.
 *
 * Toda a agregação acontece no servidor (RPC get_agency_admin_dashboard),
 * que resolve a agência pelo usuário autenticado, respeita as permissões da
 * equipe e nunca devolve valores financeiros.
 */

export interface AdminActivityItem {
  /** "event" (agenda) ou "followup" (oportunidade). */
  kind: "event" | "followup" | string;
  id: string;
  /** Id de destino: evento na agenda ou oportunidade no funil. */
  link_id: string;
  title: string;
  subtitle: string | null;
  type_label: string | null;
  activity_date: string;
  activity_time: string | null;
  all_day: boolean | null;
  overdue: boolean;
}

export interface AdminTripItem {
  id: string;
  client_name: string | null;
  destination: string | null;
  trip_title: string | null;
  start_date: string;
  end_date: string | null;
  days_remaining: number;
  operation_id: string | null;
  operation_status: string | null;
  has_wallet: boolean;
}

export interface AdminRecentItem {
  kind: "quote" | "itinerary" | "wallet" | "opportunity" | "operation" | string;
  id: string;
  title: string;
  subtitle: string | null;
  status: string | null;
  updated_at: string;
  responsible_name: string | null;
}

export interface AdminDashboardCounters {
  opportunities_new: number | null;
  opportunities_open: number | null;
  operations_active: number | null;
}

export interface AdminDashboardCapabilities {
  reservations: boolean;
  opportunities: boolean;
  operations: boolean;
  quotes: boolean;
  itineraries: boolean;
  wallet: boolean;
  agenda: boolean;
  trips: boolean;
  financial: boolean;
  clients: boolean;
  clients_create: boolean;
  quotes_create: boolean;
  wallet_create: boolean;
  itineraries_create: boolean;
  operations_create: boolean;
}

export interface AdminDashboardData {
  today: string;
  timeZone: string;
  todayItems: AdminActivityItem[];
  upcomingItems: AdminActivityItem[];
  trips: AdminTripItem[];
  recentProjects: AdminRecentItem[];
  recentOpportunities: AdminRecentItem[];
  recentOperations: AdminRecentItem[];
  counters: AdminDashboardCounters;
  can: AdminDashboardCapabilities;
}

const EMPTY_CAN: AdminDashboardCapabilities = {
  reservations: false,
  opportunities: false,
  operations: false,
  quotes: false,
  itineraries: false,
  wallet: false,
  agenda: false,
  trips: false,
  financial: false,
  clients: false,
  clients_create: false,
  quotes_create: false,
  wallet_create: false,
  itineraries_create: false,
  operations_create: false,
};

const EMPTY_COUNTERS: AdminDashboardCounters = {
  opportunities_new: null,
  opportunities_open: null,
  operations_active: null,
};

const sb = supabase as any;

export function useAgencyAdminDashboard(enabled = true) {
  const { user } = useAuth();
  const timeZone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Sao_Paulo";

  const query = useQuery({
    queryKey: ["agency-admin-dashboard", user?.id, timeZone],
    enabled: !!user?.id && enabled,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AdminDashboardData> => {
      const { data, error } = await sb.rpc("get_agency_admin_dashboard", {
        _time_zone: timeZone,
      });
      if (error) throw error;
      const payload = (data || {}) as any;
      return {
        today: payload.today ?? new Date().toISOString().slice(0, 10),
        timeZone: payload.time_zone ?? timeZone,
        todayItems: (payload.today_items || []) as AdminActivityItem[],
        upcomingItems: (payload.upcoming_items || []) as AdminActivityItem[],
        trips: (payload.trips || []) as AdminTripItem[],
        recentProjects: (payload.recent_projects || []) as AdminRecentItem[],
        recentOpportunities: (payload.recent_opportunities || []) as AdminRecentItem[],
        recentOperations: (payload.recent_operations || []) as AdminRecentItem[],
        counters: { ...EMPTY_COUNTERS, ...(payload.counters || {}) },
        can: { ...EMPTY_CAN, ...(payload.can || {}) },
      };
    },
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
