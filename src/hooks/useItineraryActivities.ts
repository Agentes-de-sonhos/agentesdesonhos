import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface ItineraryActivity {
  id: string;
  trip_id: string;
  day_date: string;
  period: "morning" | "afternoon" | "evening";
  title: string;
  description: string | null;
  start_time: string | null;
  location: string | null;
  notes: string | null;
  linked_service_id: string | null;
  photo_urls: string[];
  document_urls: string[];
  maps_url: string | null;
  order_index: number;
  origin: "servico" | "ia" | "manual";
  created_at: string;
  updated_at: string;
}

export interface CreateActivityData {
  trip_id: string;
  day_date: string;
  period: "morning" | "afternoon" | "evening";
  title: string;
  description?: string;
  start_time?: string;
  location?: string;
  notes?: string;
  linked_service_id?: string | null;
  photo_urls?: string[];
  document_urls?: string[];
  maps_url?: string | null;
  order_index?: number;
}

export function useItineraryActivities(tripId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["itinerary-activities", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from("trip_itinerary_activities")
        .select("*")
        .eq("trip_id", tripId)
        .order("day_date", { ascending: true })
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ItineraryActivity[];
    },
    enabled: !!tripId,
  });

  const addActivity = useMutation({
    mutationFn: async (data: CreateActivityData) => {
      // Get max order_index for this day+period
      const existing = activities.filter(
        (a) => a.day_date === data.day_date && a.period === data.period
      );
      const maxOrder = existing.length > 0
        ? Math.max(...existing.map((a) => a.order_index))
        : -1;

      const { data: result, error } = await supabase
        .from("trip_itinerary_activities")
        .insert({
          ...data,
          order_index: data.order_index ?? maxOrder + 1,
          photo_urls: data.photo_urls ?? [],
          document_urls: data.document_urls ?? [],
          maps_url: data.maps_url ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-activities", tripId] });
      toast({ title: "Atividade adicionada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao adicionar atividade", description: err.message, variant: "destructive" });
    },
  });

  const updateActivity = useMutation({
    mutationFn: async ({ id, ...data }: Partial<ItineraryActivity> & { id: string }) => {
      const { error } = await supabase
        .from("trip_itinerary_activities")
        .update({ ...data, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-activities", tripId] });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao atualizar atividade", description: err.message, variant: "destructive" });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("trip_itinerary_activities")
        .delete()
        .eq("id", activityId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-activities", tripId] });
      toast({ title: "Atividade removida" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover atividade", description: err.message, variant: "destructive" });
    },
  });

  const reorderActivities = useMutation({
    mutationFn: async (updates: { id: string; order_index: number; period?: string }[]) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("trip_itinerary_activities")
          .update({ order_index: u.order_index, ...(u.period ? { period: u.period } : {}) })
          .eq("id", u.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-activities", tripId] });
    },
  });

  const uploadPhoto = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const sanitizedName = file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `itinerary/${tripId}/${Date.now()}_${sanitizedName}.${ext}`;
    const { error } = await supabase.storage.from("vouchers").upload(path, file);
    if (error) throw error;
    return path; // Store path only, signed URLs generated on demand
  };

  const uploadDocument = async (file: File): Promise<{ url: string; name: string }> => {
    const MAX_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_SIZE) throw new Error("Arquivo excede o limite de 10MB");
    const ext = file.name.split(".").pop()?.toLowerCase() || "pdf";
    const allowed = ["pdf", "jpg", "jpeg", "png", "webp"];
    if (!allowed.includes(ext)) throw new Error("Formato não permitido. Use PDF, JPG ou PNG.");
    const sanitizedName = file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `itinerary-docs/${tripId}/${Date.now()}_${sanitizedName}.${ext}`;
    const { error } = await supabase.storage.from("vouchers").upload(path, file);
    if (error) throw error;
    return { url: path, name: file.name }; // Store path only
  };

  return {
    activities,
    isLoading,
    addActivity: addActivity.mutateAsync,
    updateActivity: updateActivity.mutateAsync,
    deleteActivity: deleteActivity.mutateAsync,
    reorderActivities: reorderActivities.mutateAsync,
    isAdding: addActivity.isPending,
    uploadPhoto,
    uploadDocument,
  };
}
