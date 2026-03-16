import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { 
  AgencyEvent, 
  PresetEvent, 
  HiddenPresetEvent, 
  CalendarEvent, 
  CustomEventType,
  AgendaFilterPreferences,
  eventTypeColors,
  eventTypeLabels,
  defaultAgencyEventTypes,
  presetEventTypes,
} from "@/types/agenda";

export interface EventTypeOption {
  id: string;
  name: string;
  color: string;
  isCustom?: boolean;
}

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

  // Fetch highlighted events for the user
  const { data: highlightedEvents = [], isLoading: highlightedLoading } = useQuery({
    queryKey: ["highlighted-events", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("highlighted_events" as any)
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user?.id,
  });

  // Fetch custom event types for the user
  const { data: customEventTypes = [], isLoading: customTypesLoading } = useQuery({
    queryKey: ["custom-event-types", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("custom_event_types")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data as CustomEventType[];
    },
    enabled: !!user?.id,
  });

  // Fetch filter preferences for the user
  const { data: filterPreferences, isLoading: filterLoading } = useQuery({
    queryKey: ["agenda-filter-preferences", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      const { data, error } = await supabase
        .from("agenda_filter_preferences")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data as AgendaFilterPreferences | null;
    },
    enabled: !!user?.id,
  });

  // Build complete list of event types for filter (deduplicated)
  const seenTypeIds = new Set<string>();
  const allEventTypes: EventTypeOption[] = [];
  
  // Default agency event types
  defaultAgencyEventTypes.forEach(type => {
    if (!seenTypeIds.has(type)) {
      seenTypeIds.add(type);
      allEventTypes.push({
        id: type,
        name: eventTypeLabels[type],
        color: eventTypeColors[type],
        isCustom: false,
      });
    }
  });
  
  // Preset event types (skip duplicates like 'trade')
  presetEventTypes.forEach(type => {
    if (!seenTypeIds.has(type)) {
      seenTypeIds.add(type);
      allEventTypes.push({
        id: type,
        name: eventTypeLabels[type],
        color: eventTypeColors[type],
        isCustom: false,
      });
    }
  });
  
  // Custom user types
  customEventTypes.forEach(type => {
    const customId = `custom_${type.id}`;
    if (!seenTypeIds.has(customId)) {
      seenTypeIds.add(customId);
      allEventTypes.push({
        id: customId,
        name: type.name,
        color: type.color,
        isCustom: true,
      });
    }
  });

  // Get hidden types from preferences
  const hiddenTypes = filterPreferences?.hidden_types || [];

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
      location_city?: string | null;
      location_address?: string | null;
      event_url?: string | null;
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agency-events"] });
      toast.success("Evento atualizado com sucesso!");
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

  // Create custom event type
  const createCustomTypeMutation = useMutation({
    mutationFn: async (typeData: { name: string; color: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from("custom_event_types")
        .insert({ 
          user_id: user.id,
          name: typeData.name,
          color: typeData.color,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["custom-event-types"] });
      toast.success("Tipo de evento criado com sucesso!");
    },
    onError: (error: any) => {
      console.error("Error creating custom type:", error);
      if (error.code === '23505') {
        toast.error("Já existe um tipo com esse nome");
      } else {
        toast.error("Erro ao criar tipo de evento");
      }
    },
  });

  // Update filter preferences
  const updateFilterPreferencesMutation = useMutation({
    mutationFn: async (hiddenTypes: string[]) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      
      const { data, error } = await supabase
        .from("agenda_filter_preferences")
        .upsert({ 
          user_id: user.id,
          hidden_types: hiddenTypes,
        }, {
          onConflict: 'user_id',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["agenda-filter-preferences"] });
    },
    onError: (error) => {
      console.error("Error updating filter preferences:", error);
      toast.error("Erro ao salvar preferências de filtro");
    },
  });

  // Toggle event type visibility
  const toggleEventTypeVisibility = (typeId: string, currentlyVisible: boolean) => {
    const newHiddenTypes = currentlyVisible
      ? [...hiddenTypes, typeId]
      : hiddenTypes.filter(t => t !== typeId);
    updateFilterPreferencesMutation.mutate(newHiddenTypes);
  };

  // Highlight event
  const highlightEventMutation = useMutation({
    mutationFn: async ({ eventId, source }: { eventId: string; source: string }) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("highlighted_events" as any)
        .insert({ user_id: user.id, event_id: eventId, event_source: source });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlighted-events"] });
      toast.success("Evento destacado no Dashboard!");
    },
    onError: () => toast.error("Erro ao destacar evento"),
  });

  // Unhighlight event
  const unhighlightEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      const { error } = await supabase
        .from("highlighted_events" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("event_id", eventId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["highlighted-events"] });
      toast.success("Destaque removido!");
    },
    onError: () => toast.error("Erro ao remover destaque"),
  });

  const highlightedEventIds = new Set(highlightedEvents.map((h: any) => h.event_id));

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
      location_city: (event as any).location_city,
      location_address: (event as any).location_address,
      event_url: (event as any).event_url,
    })),
    // Preset events (not hidden by user)
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

  // Filter events by hidden types (but always keep highlighted events)
  const filteredEvents = allEvents.filter(event => {
    // Highlighted events always pass through
    if (highlightedEventIds.has(event.id)) return true;
    
    // Check if this event type is hidden in filters
    const isTypeHidden = hiddenTypes.includes(event.event_type);
    
    // For custom types, check with custom_ prefix
    const customType = customEventTypes.find(t => 
      event.color === t.color && !defaultAgencyEventTypes.includes(event.event_type as any)
    );
    const isCustomTypeHidden = customType && hiddenTypes.includes(`custom_${customType.id}`);
    
    return !isTypeHidden && !isCustomTypeHidden;
  });

  // Get events for a specific date
  const getEventsForDate = (date: string): CalendarEvent[] => {
    return filteredEvents.filter(event => event.event_date === date);
  };

  // Get upcoming events (next 10)
  const getUpcomingEvents = (limit: number = 10): CalendarEvent[] => {
    const today = new Date().toISOString().split('T')[0];
    return filteredEvents
      .filter(event => event.event_date >= today)
      .sort((a, b) => a.event_date.localeCompare(b.event_date))
      .slice(0, limit);
  };

  return {
    allEvents: filteredEvents,
    agencyEvents,
    presetEvents,
    hiddenPresetEvents,
    customEventTypes,
    allEventTypes,
    hiddenTypes,
    isLoading: agencyLoading || presetLoading || hiddenLoading || customTypesLoading || filterLoading || highlightedLoading,
    getEventsForDate,
    getUpcomingEvents,
    createEvent: createEventMutation.mutate,
    updateEvent: updateEventMutation.mutate,
    deleteEvent: deleteEventMutation.mutate,
    hidePresetEvent: hidePresetEventMutation.mutate,
    unhidePresetEvent: unhidePresetEventMutation.mutate,
    createCustomType: createCustomTypeMutation.mutate,
    toggleEventTypeVisibility,
    highlightEvent: (eventId: string, source: string) => highlightEventMutation.mutate({ eventId, source }),
    unhighlightEvent: (eventId: string) => unhighlightEventMutation.mutate(eventId),
    highlightedEventIds,
    isCreating: createEventMutation.isPending,
    isUpdating: updateEventMutation.isPending,
    isDeleting: deleteEventMutation.isPending,
    isCreatingCustomType: createCustomTypeMutation.isPending,
  };
}
