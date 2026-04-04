import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { TripReminder } from "@/types/reminder";

export function useReminders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: reminders = [], isLoading } = useQuery({
    queryKey: ["trip-reminders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("trip_reminders")
        .select(`
          *,
          trip:trips(id, client_name, destination, start_date, end_date)
        `)
        .eq("user_id", user.id)
        .eq("is_completed", false)
        .gte("reminder_date", new Date().toISOString().split("T")[0])
        .order("reminder_date", { ascending: true });

      if (error) throw error;
      return data as TripReminder[];
    },
    enabled: !!user,
  });

  const { data: allReminders = [], isLoading: isLoadingAll } = useQuery({
    queryKey: ["all-trip-reminders", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await supabase
        .from("trip_reminders")
        .select(`
          *,
          trip:trips(id, client_name, destination, start_date, end_date)
        `)
        .eq("user_id", user.id)
        .order("reminder_date", { ascending: false });

      if (error) throw error;
      return data as TripReminder[];
    },
    enabled: !!user,
  });

  const updateFollowUpMutation = useMutation({
    mutationFn: async ({ id, follow_up_note }: { id: string; follow_up_note: string }) => {
      const { error } = await supabase
        .from("trip_reminders")
        .update({ follow_up_note })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["all-trip-reminders"] });
      toast({
        title: "Follow-up salvo",
        description: "A nota de follow-up foi atualizada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const markCompletedMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trip_reminders")
        .update({ is_completed: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip-reminders"] });
      queryClient.invalidateQueries({ queryKey: ["all-trip-reminders"] });
      toast({
        title: "Lembrete concluído",
        description: "O lembrete foi marcado como concluído.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Calculate days remaining for each reminder
  const remindersWithDays = reminders.map((reminder) => {
    const today = new Date();
    const todayLocal = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateStr = reminder.trip?.start_date || "";
    const [y, m, d] = dateStr.split("-").map(Number);
    const tripDate = new Date(y, m - 1, d);
    const diffTime = tripDate.getTime() - todayLocal.getTime();
    const daysRemaining = Math.round(diffTime / (1000 * 60 * 60 * 24));
    return { ...reminder, daysRemaining };
  });

  // Group by trip and keep only the nearest (first) reminder per trip
  const nextReminderPerTrip = (() => {
    const seen = new Set<string>();
    return remindersWithDays.filter((r) => {
      if (seen.has(r.trip_id)) return false;
      seen.add(r.trip_id);
      return true;
    });
  })();

  return {
    reminders: nextReminderPerTrip,
    allReminders,
    isLoading,
    isLoadingAll,
    updateFollowUp: updateFollowUpMutation.mutateAsync,
    markCompleted: markCompletedMutation.mutateAsync,
    isUpdating: updateFollowUpMutation.isPending || markCompletedMutation.isPending,
  };
}
