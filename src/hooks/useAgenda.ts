import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { AgencyEvent, PresetEvent, HiddenPresetEvent, CalendarEvent, eventTypeColors } from "@/types/agenda";

export function useAgenda(year?: number) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const currentYear = year || new Date().getFullYear();

  // Fetch agency events for the user
  const { data: agencyEvents = [], isLoading: agencyLoading } = useQuery({
    queryKey: ["agency-events", user?.id, currentYear],
    queryFn: async () => {
      if (!user?.id) return [];
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const { data, error } = await supabase
        .from("agency_events")
        .select("*")
        .eq("user_id", user.id)
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as AgencyEvent[];
    },
    enabled: !!user?.id,
  });

  // Fetch preset events (holidays, trade events)
  const { data: presetEvents = [], isLoading: presetLoading } = useQuery({
    queryKey: ["preset-events", currentYear],
    queryFn: async () => {
      const startDate = `${currentYear}-01-01`;
      const endDate = `${currentYear}-12-31`;
      
      const { data, error } = await supabase
        .from("preset_events")
        .select("*")
        .eq("is_active", true)
        .gte("event_date", startDate)
        .lte("event_date", endDate)
        .order("event_date", { ascending: true });

      if (error) throw error;
      return data as PresetEvent[];
    },
  });

  // Fetch hidden preset events for the user
  const { data: hiddenPresetEvents = [], isLoading: hiddenLoading } = useQuery({
    queryKey: ["hidden-preset-events", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("hidden_preset_events")
        .select("*")
        .eq("user_id", user.id);

      if (error) throw error;
      return data as HiddenPresetEvent[];
    },
    enabled: !!user?.id,
  });

  // Create agency event
  const createEventMutation = useMutation({
    mutationFn: async (event: {
      title: string;
      description: string | null;
      event_type: string;
      event_date: string;
      event_time: string | null;
      color: string | null;
      client_id?: string | null;
      opportunity_id?: string | null;
    }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from("agency_events")
        .insert({ 
          ...event, 
          user_id: user.id,
          client_id: event.client_id || null,
          opportunity_id: event.opportunity_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-events"] });
      toast.success("Evento criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating event:", error);
      toast.error("Erro ao criar evento");
    },
  });

  // Update agency event
  const updateEventMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<{
      title: string;
      description: string | null;
      event_type: string;
      event_date: string;
      event_time: string | null;
      color: string | null;
    }>) => {
      const { data, error } = await supabase
        .from("agency_events")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onError: (error) => {
      console.error("Error updating event:", error);
      toast.error("Erro ao atualizar evento");
    },
  });

  // Delete agency event
  const deleteEventMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("agency_events")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-events"] });
      toast.success("Evento excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting event:", error);
      toast.error("Erro ao excluir evento");
    },
  });

  // Hide preset event
  const hidePresetEventMutation = useMutation({
    mutationFn: async (presetEventId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("hidden_preset_events")
        .insert({ user_id: user.id, preset_event_id: presetEventId });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-preset-events"] });
      toast.success("Evento oculto com sucesso!");
    },
    onError: (error) => {
      console.error("Error hiding event:", error);
      toast.error("Erro ao ocultar evento");
    },
  });

  // Unhide preset event
  const unhidePresetEventMutation = useMutation({
    mutationFn: async (presetEventId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { error } = await supabase
        .from("hidden_preset_events")
        .delete()
        .eq("user_id", user.id)
        .eq("preset_event_id", presetEventId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hidden-preset-events"] });
      toast.success("Evento restaurado com sucesso!");
    },
    onError: (error) => {
      console.error("Error unhiding event:", error);
      toast.error("Erro ao restaurar evento");
    },
  });

  // Combine all events into a unified format
  const hiddenIds = new Set(hiddenPresetEvents.map(h => h.preset_event_id));
  
  const allEvents: CalendarEvent[] = [
    // Agency events
    ...agencyEvents.map((event): CalendarEvent => ({
      id: event.id,
      title: event.title,
      description: event.description,
      event_type: event.event_type,
      event_date: event.event_date,
      event_time: event.event_time,
      color: event.color || eventTypeColors[event.event_type] || '#6b7280',
      isPreset: false,
      client_id: event.client_id,
      opportunity_id: event.opportunity_id,
    })),
    // Preset events (not hidden)
    ...presetEvents
      .filter(event => !hiddenIds.has(event.id))
      .map((event): CalendarEvent => ({
        id: event.id,
        title: event.title,
        description: event.description,
        event_type: event.event_type,
        event_date: event.event_date,
        event_time: null,
        color: event.color || eventTypeColors[event.event_type] || '#6b7280',
        isPreset: true,
      })),
  ];

  // Get events for a specific date
  const getEventsForDate = (date: string): CalendarEvent[] => {
    return allEvents.filter(event => event.event_date === date);
  };

  // Get upcoming events (next 10)
  const getUpcomingEvents = (limit: number = 10): CalendarEvent[] => {
    const today = new Date().toISOString().split('T')[0];
    return allEvents
      .filter(event => event.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, limit);
  };

  return {
    allEvents,
    agencyEvents,
    presetEvents,
    hiddenPresetEvents,
    isLoading: agencyLoading || presetLoading || hiddenLoading,
    getEventsForDate,
    getUpcomingEvents,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    hidePresetEvent: hidePresetEventMutation.mutate,
    unhidePresetEvent: unhidePresetEventMutation.mutate,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
  };
}
