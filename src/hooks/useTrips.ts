import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Trip, TripService, TripFormData, TripServiceType, TripServiceData } from "@/types/trip";

export function useTrips() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: trips = [], isLoading } = useQuery({
    queryKey: ["trips", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("trips")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
  });

  const createTripMutation = useMutation({
    mutationFn: async (formData: TripFormData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          client_name: formData.client_name,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: "active",
        })
        .select()
        .single();

      if (error) throw error;
      return data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({
        title: "Viagem criada",
        description: "A viagem foi criada com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar viagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({
        title: "Viagem excluída",
        description: "A viagem foi excluída com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir viagem",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const shareTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const shareToken = crypto.randomUUID().slice(0, 8);
      
      const { error } = await supabase
        .from("trips")
        .update({ share_token: shareToken })
        .eq("id", id);

      if (error) throw error;
      return shareToken;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({
        title: "Link gerado",
        description: "O link de compartilhamento foi gerado.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao gerar link",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    trips,
    isLoading,
    createTrip: createTripMutation.mutateAsync,
    deleteTrip: deleteTripMutation.mutateAsync,
    shareTrip: shareTripMutation.mutateAsync,
    isCreating: createTripMutation.isPending,
    isSharing: shareTripMutation.isPending,
  };
}

export function useTrip(id: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: trip, isLoading } = useQuery({
    queryKey: ["trip", id],
    queryFn: async () => {
      if (!id) return null;

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("id", id)
        .single();

      if (tripError) throw tripError;

      const { data: servicesData, error: servicesError } = await supabase
        .from("trip_services")
        .select("*")
        .eq("trip_id", id)
        .order("order_index", { ascending: true });

      if (servicesError) throw servicesError;

      return {
        ...tripData,
        services: servicesData.map((s) => ({
          ...s,
          service_type: s.service_type as TripServiceType,
          service_data: s.service_data as unknown as TripServiceData,
        })),
      } as Trip;
    },
    enabled: !!id,
  });

  const addServiceMutation = useMutation({
    mutationFn: async ({
      service_type,
      service_data,
      voucher_url,
      voucher_name,
    }: {
      service_type: TripServiceType;
      service_data: TripServiceData;
      voucher_url?: string;
      voucher_name?: string;
    }) => {
      if (!id) throw new Error("Trip ID is required");

      const currentServices = trip?.services || [];
      const nextOrderIndex = currentServices.length;

      const { data, error } = await supabase
        .from("trip_services")
        .insert({
          trip_id: id,
          service_type,
          service_data: service_data as any,
          voucher_url: voucher_url || null,
          voucher_name: voucher_name || null,
          order_index: nextOrderIndex,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({
        title: "Serviço adicionado",
        description: "O serviço foi adicionado à viagem.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao adicionar serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const service = trip?.services?.find((s) => s.id === serviceId);
      
      // Delete voucher from storage if exists
      if (service?.voucher_url && user) {
        const path = service.voucher_url.split('/vouchers/')[1];
        if (path) {
          await supabase.storage.from("vouchers").remove([path]);
        }
      }

      const { error } = await supabase
        .from("trip_services")
        .delete()
        .eq("id", serviceId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({
        title: "Serviço removido",
        description: "O serviço foi removido da viagem.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao remover serviço",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const uploadVoucher = async (file: File): Promise<{ url: string; name: string }> => {
    if (!user) throw new Error("User not authenticated");
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${id}/${crypto.randomUUID()}.${fileExt}`;
    
    const { error } = await supabase.storage
      .from("vouchers")
      .upload(fileName, file);

    if (error) throw error;

    const { data: { publicUrl } } = supabase.storage
      .from("vouchers")
      .getPublicUrl(fileName);

    return { url: publicUrl, name: file.name };
  };

  return {
    trip,
    isLoading,
    addService: addServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
    uploadVoucher,
    isAddingService: addServiceMutation.isPending,
  };
}

export function usePublicTrip(token: string | undefined) {
  const { data: trip, isLoading } = useQuery({
    queryKey: ["public-trip", token],
    queryFn: async () => {
      if (!token) return null;

      const { data: tripData, error: tripError } = await supabase
        .from("trips")
        .select("*")
        .eq("share_token", token)
        .single();

      if (tripError) throw tripError;

      const { data: servicesData, error: servicesError } = await supabase
        .from("trip_services")
        .select("*")
        .eq("trip_id", tripData.id)
        .order("order_index", { ascending: true });

      if (servicesError) throw servicesError;

      return {
        ...tripData,
        services: servicesData.map((s) => ({
          ...s,
          service_type: s.service_type as TripServiceType,
          service_data: s.service_data as unknown as TripServiceData,
        })),
      } as Trip;
    },
    enabled: !!token,
  });

  return { trip, isLoading };
}
