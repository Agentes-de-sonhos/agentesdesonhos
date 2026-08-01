import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UpcomingTrip {
  id: string;
  client_name: string | null;
  trip_title: string | null;
  destination: string | null;
  start_date: string;
  end_date: string | null;
  status: string;
  /** Days until start_date (negative when the trip is already in progress). */
  daysRemaining: number;
  inProgress: boolean;
  /** Complementary reminder data — never defines the existence of the item. */
  reminderId: string | null;
  followUpNote: string | null;
}

/** Statuses that must never show up as an upcoming trip. */
const EXCLUDED_STATUSES = ["archived", "cancelado", "cancelled", "canceled", "concluido", "concluído", "completed"];

function todayLocal(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function parseLocalDate(value?: string | null): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

export function daysUntil(dateStr: string): number {
  const date = parseLocalDate(dateStr);
  if (!date) return 0;
  return Math.round((date.getTime() - todayLocal().getTime()) / 86400000);
}

/**
 * Source of truth for the "Próximas Viagens" page: the trip entity itself
 * (one row per trip_id), scoped by user_id + existing RLS. Reminders are only
 * attached as complementary follow-up data.
 */
export function useUpcomingTrips() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ["upcoming-trips", user?.id],
    queryFn: async (): Promise<UpcomingTrip[]> => {
      if (!user) return [];
      const today = new Date().toISOString().split("T")[0];

      const { data: trips, error } = await supabase
        .from("trips")
        .select("id, client_name, trip_title, destination, start_date, end_date, status")
        .eq("user_id", user.id)
        .gte("end_date", today)
        .order("start_date", { ascending: true })
        .limit(500);
      if (error) throw error;

      const rows = (trips || []).filter(
        (t: any) => !EXCLUDED_STATUSES.includes(String(t.status || "").toLowerCase()),
      );
      if (rows.length === 0) return [];

      // Complementary follow-up notes (may not exist for every trip).
      const { data: reminders } = await supabase
        .from("trip_reminders")
        .select("id, trip_id, follow_up_note, reminder_date")
        .eq("user_id", user.id)
        .in("trip_id", rows.map((t: any) => t.id))
        .order("reminder_date", { ascending: true });

      const byTrip = new Map<string, { id: string; follow_up_note: string | null }>();
      for (const r of reminders || []) {
        const existing = byTrip.get((r as any).trip_id);
        // keep the first (nearest) reminder, but prefer one that already has a note
        if (!existing || (!existing.follow_up_note && (r as any).follow_up_note)) {
          byTrip.set((r as any).trip_id, { id: (r as any).id, follow_up_note: (r as any).follow_up_note ?? null });
        }
      }

      return rows.map((t: any) => {
        const daysRemaining = daysUntil(t.start_date);
        const reminder = byTrip.get(t.id);
        return {
          id: t.id,
          client_name: t.client_name ?? null,
          trip_title: t.trip_title ?? null,
          destination: t.destination ?? null,
          start_date: t.start_date,
          end_date: t.end_date ?? null,
          status: t.status,
          daysRemaining,
          inProgress: daysRemaining < 0,
          reminderId: reminder?.id ?? null,
          followUpNote: reminder?.follow_up_note ?? null,
        };
      });
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    trips: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
