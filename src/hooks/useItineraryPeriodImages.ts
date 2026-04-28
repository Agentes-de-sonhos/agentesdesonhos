import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type ItineraryPeriod = "manha" | "tarde" | "noite";

export interface ItineraryPeriodImage {
  id: string;
  itinerary_id: string;
  day_date: string;
  period: ItineraryPeriod;
  image_url: string;
}

export function useItineraryPeriodImages(itineraryId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: periodImages = [], isLoading } = useQuery({
    queryKey: ["itinerary-period-images", itineraryId],
    queryFn: async () => {
      if (!itineraryId) return [];
      const { data, error } = await supabase
        .from("itinerary_period_images" as any)
        .select("*")
        .eq("itinerary_id", itineraryId);
      if (error) throw error;
      return (data || []) as unknown as ItineraryPeriodImage[];
    },
    enabled: !!itineraryId,
  });

  const getImageForPeriod = (dayDate: string, period: ItineraryPeriod): string | null => {
    const found = periodImages.find((p) => p.day_date === dayDate && p.period === period);
    return found?.image_url || null;
  };

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const sanitized = file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `itineraries/${itineraryId}/${Date.now()}_${sanitized}.${ext}`;
    const { error } = await supabase.storage.from("media-files").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });
    if (error) throw error;
    const { data } = supabase.storage.from("media-files").getPublicUrl(path);
    return data.publicUrl;
  };

  const setPeriodImage = useMutation({
    mutationFn: async ({
      dayDate,
      period,
      file,
    }: {
      dayDate: string;
      period: ItineraryPeriod;
      file: File;
    }) => {
      if (!itineraryId) throw new Error("Roteiro não encontrado");
      if (file.size > 8 * 1024 * 1024) throw new Error("Imagem muito grande (máx 8MB)");
      if (!file.type.startsWith("image/")) throw new Error("Envie um arquivo de imagem");
      const imageUrl = await uploadImage(file);
      const existing = periodImages.find(
        (p) => p.day_date === dayDate && p.period === period
      );
      if (existing) {
        const { error } = await supabase
          .from("itinerary_period_images" as any)
          .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("itinerary_period_images" as any)
          .insert({ itinerary_id: itineraryId, day_date: dayDate, period, image_url: imageUrl });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-period-images", itineraryId] });
      toast({ title: "Foto atualizada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    },
  });

  const removePeriodImage = useMutation({
    mutationFn: async ({ dayDate, period }: { dayDate: string; period: ItineraryPeriod }) => {
      const existing = periodImages.find(
        (p) => p.day_date === dayDate && p.period === period
      );
      if (!existing) return;
      const { error } = await supabase
        .from("itinerary_period_images" as any)
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary-period-images", itineraryId] });
      toast({ title: "Foto removida" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover foto", description: err.message, variant: "destructive" });
    },
  });

  return {
    periodImages,
    isLoading,
    getImageForPeriod,
    setPeriodImage: setPeriodImage.mutateAsync,
    removePeriodImage: removePeriodImage.mutateAsync,
    isUploading: setPeriodImage.isPending,
  };
}