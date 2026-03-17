import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface PeriodImage {
  id: string;
  trip_id: string;
  day_date: string;
  period: "morning" | "afternoon" | "evening";
  image_url: string;
  created_at: string;
  updated_at: string;
}

export function usePeriodImages(tripId: string | undefined) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: periodImages = [], isLoading } = useQuery({
    queryKey: ["period-images", tripId],
    queryFn: async () => {
      if (!tripId) return [];
      const { data, error } = await supabase
        .from("trip_itinerary_period_images")
        .select("*")
        .eq("trip_id", tripId);
      if (error) throw error;
      return data as PeriodImage[];
    },
    enabled: !!tripId,
  });

  const getImageForPeriod = (dayDate: string, period: string): string | null => {
    const found = periodImages.find(
      (p) => p.day_date === dayDate && p.period === period
    );
    return found?.image_url || null;
  };

  const uploadPeriodImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const sanitizedName = file.name
      .replace(/\.[^.]+$/, "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_");
    const path = `itinerary-periods/${tripId}/${Date.now()}_${sanitizedName}.${ext}`;
    const { error } = await supabase.storage.from("vouchers").upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage.from("vouchers").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const setPeriodImage = useMutation({
    mutationFn: async ({
      dayDate,
      period,
      file,
    }: {
      dayDate: string;
      period: "morning" | "afternoon" | "evening";
      file: File;
    }) => {
      if (!tripId) throw new Error("Trip ID required");
      const imageUrl = await uploadPeriodImage(file);

      // Upsert
      const existing = periodImages.find(
        (p) => p.day_date === dayDate && p.period === period
      );
      if (existing) {
        const { error } = await supabase
          .from("trip_itinerary_period_images")
          .update({ image_url: imageUrl, updated_at: new Date().toISOString() })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("trip_itinerary_period_images")
          .insert({ trip_id: tripId, day_date: dayDate, period, image_url: imageUrl });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-images", tripId] });
      toast({ title: "Imagem do período atualizada" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao enviar imagem", description: err.message, variant: "destructive" });
    },
  });

  const removePeriodImage = useMutation({
    mutationFn: async ({
      dayDate,
      period,
    }: {
      dayDate: string;
      period: "morning" | "afternoon" | "evening";
    }) => {
      const existing = periodImages.find(
        (p) => p.day_date === dayDate && p.period === period
      );
      if (!existing) return;
      const { error } = await supabase
        .from("trip_itinerary_period_images")
        .delete()
        .eq("id", existing.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["period-images", tripId] });
      toast({ title: "Imagem removida" });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao remover imagem", description: err.message, variant: "destructive" });
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
