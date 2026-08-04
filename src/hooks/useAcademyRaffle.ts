import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RaffleCapabilities, RaffleParticipant } from "@/lib/raffle/types";

export interface AcademyRaffleEvent {
  training_id: string;
  title: string;
  training_type: string;
  scheduled_at: string | null;
  is_active: boolean;
  trail_id: string | null;
  trail_name: string | null;
  destination: string | null;
  registrations_count: number;
  attended_count: number;
  completed_count: number;
  last_activity_at: string | null;
}

/** Capacidades reais da origem Academy (dados que existem de fato no banco). */
export const ACADEMY_CAPABILITIES: RaffleCapabilities = {
  attendance: true,
  watchedMinutes: true,
  survey: true,
  registrationStatus: true,
  // Cruzamento com assinantes ainda não disponível — nunca inventar valor.
  subscribers: false,
};

export function useAcademyRaffleEvents(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["academy-raffle-events"],
    enabled: enabled && !!user,
    staleTime: 2 * 60_000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<AcademyRaffleEvent[]> => {
      const { data, error } = await supabase.rpc("academy_raffle_events");
      if (error) throw error;
      return (data ?? []) as AcademyRaffleEvent[];
    },
  });
}

export function useAcademyEventParticipants(trainingId: string | null) {
  return useQuery({
    queryKey: ["academy-raffle-participants", trainingId],
    enabled: !!trainingId,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async ({ signal }): Promise<RaffleParticipant[]> => {
      const { data, error } = await supabase
        .rpc("academy_event_participants", { p_training_id: trainingId! })
        .abortSignal(signal);
      if (error) throw error;
      return (data ?? []).map((row: Record<string, unknown>) => {
        const completed = row.is_completed === true;
        const minutes = Number(row.watched_minutes ?? 0);
        const participant: RaffleParticipant = {
          id: String(row.participant_user_id ?? crypto.randomUUID()),
          name: String(row.name ?? "").trim() || String(row.email ?? "").trim(),
          email: (row.email as string) ?? null,
          phone: (row.phone as string) ?? null,
          company: (row.agency_name as string) ?? null,
          city: (row.city as string) ?? null,
          state: (row.state as string) ?? null,
          country: null,
          enrolledAt: (row.enrolled_at as string) ?? null,
          registrationStatus: completed ? "concluido" : minutes > 0 ? "presente" : "inscrito",
          attended: completed || minutes > 0,
          watchedMinutes: Number.isFinite(minutes) ? minutes : null,
          surveyAnswered: row.survey_answered === true,
          surveyScore: row.survey_score === null ? null : Number(row.survey_score),
          eventsParticipated: Number(row.events_participated ?? 0),
          isSubscriber: null,
          raw: { ...row },
        };
        return participant;
      });
    },
  });
}

export function formatAcademyEventLabel(e: AcademyRaffleEvent): string {
  const date = e.scheduled_at ?? e.last_activity_at;
  const dateLabel = date
    ? new Date(date).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" })
    : "sem data";
  const status = e.is_active ? "ativo" : "inativo";
  return `${e.title} — ${dateLabel} — ${status} — ${e.registrations_count} inscritos`;
}