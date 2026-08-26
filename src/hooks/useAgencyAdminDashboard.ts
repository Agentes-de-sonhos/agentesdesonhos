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

export type AdminAttentionKind = "reservation" | "followup" | "operation";

export interface AdminAttentionItem {
  kind: AdminAttentionKind | string;
  id: string;
  title: string;
  subtitle: string | null;
  reason: string;
  priority: number;
  due_at: string | null;
  responsible_name: string | null;
}

export interface AdminAgendaItem {
  id: string;
  title: string;
  event_type: string | null;
  event_date: string;
  event_time: string | null;
  all_day: boolean | null;
}

export interface AdminFollowupItem {
  id: string;
  opportunity_id: string;
  follow_up_date: string;
  client_name: string | null;
  destination: string | null;
  responsible_name: string | null;
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
  reservations_pending: number | null;
  opportunities_open: number | null;
  operations_active: number | null;
  trips_next_30_days: number | null;
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
  attention: AdminAttentionItem[];
  attentionTotal: number;
  agenda: AdminAgendaItem[];
  followups: AdminFollowupItem[];
  trips: AdminTripItem[];
  recent: AdminRecentItem[];
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
  clients: false,
  clients_create: false,
  quotes_create: false,
  wallet_create: false,
  itineraries_create: false,
  operations_create: false,
};

const EMPTY_COUNTERS: AdminDashboardCounters = {
  reservations_pending: null,
  opportunities_open: null,
  operations_active: null,
  trips_next_30_days: null,
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
        attention: (payload.attention || []) as AdminAttentionItem[],
        attentionTotal: Number(payload.attention_total) || 0,
        agenda: (payload.agenda || []) as AdminAgendaItem[],
        followups: (payload.followups || []) as AdminFollowupItem[],
        trips: (payload.trips || []) as AdminTripItem[],
        recent: (payload.recent || []) as AdminRecentItem[],
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
