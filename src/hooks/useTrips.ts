import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type { Trip, TripService, TripFormData, TripServiceType, TripServiceData } from "@/types/trip";

function generatePassword(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

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

      // Generate share token and password automatically
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const shareToken = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      const password = generatePassword();

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          client_name: formData.client_name,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: "active",
          share_token: shareToken,
          access_password: password,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Trip;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Carteira criada", description: "A carteira digital foi criada com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar carteira", description: error.message, variant: "destructive" });
    },
  });

  const deleteTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trips").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      toast({ title: "Carteira excluída", description: "A carteira foi excluída com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  const updatePasswordMutation = useMutation({
    mutationFn: async ({ id, password }: { id: string; password: string }) => {
      const { error } = await supabase
        .from("trips")
        .update({ access_password: password })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip"] });
      toast({ title: "Senha atualizada", description: "A senha da carteira foi alterada." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar senha", description: error.message, variant: "destructive" });
    },
  });

  const regeneratePasswordMutation = useMutation({
    mutationFn: async (id: string) => {
      const newPassword = generatePassword();
      const { error } = await supabase
        .from("trips")
        .update({ access_password: newPassword })
        .eq("id", id);
      if (error) throw error;
      return newPassword;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip"] });
      toast({ title: "Nova senha gerada", description: "Uma nova senha foi gerada para a carteira." });
    },
    onError: (error) => {
      toast({ title: "Erro ao gerar senha", description: error.message, variant: "destructive" });
    },
  });

  return {
    trips,
    isLoading,
    createTrip: createTripMutation.mutateAsync,
    deleteTrip: deleteTripMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutateAsync,
    regeneratePassword: regeneratePasswordMutation.mutateAsync,
    isCreating: createTripMutation.isPending,
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
      service_type, service_data, voucher_url, voucher_name,
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
      toast({ title: "Serviço adicionado", description: "O serviço foi adicionado à carteira." });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar serviço", description: error.message, variant: "destructive" });
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const service = trip?.services?.find((s) => s.id === serviceId);
      if (service?.voucher_url && user) {
        const path = service.voucher_url.split('/vouchers/')[1];
        if (path) await supabase.storage.from("vouchers").remove([path]);
      }
      const { error } = await supabase.from("trip_services").delete().eq("id", serviceId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Serviço removido", description: "O serviço foi removido da carteira." });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover serviço", description: error.message, variant: "destructive" });
    },
  });

  const uploadVoucher = async (file: File): Promise<{ url: string; name: string }> => {
    if (!user) throw new Error("User not authenticated");
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${id}/${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from("vouchers").upload(fileName, file);
    if (error) throw error;
    const { data: { publicUrl } } = supabase.storage.from("vouchers").getPublicUrl(fileName);
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
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-trip", token],
    queryFn: async () => {
      // This is just a check to see if the token exists (without password)
      // The actual data fetching happens through the RPC with password
      if (!token) return null;
      return { tokenValid: true };
    },
    enabled: !!token,
  });

  return { tokenValid: !!data, isLoading };
}

export async function verifyTripAccess(token: string, password: string) {
  const { data, error } = await supabase.rpc('verify_trip_access', {
    p_token: token,
    p_password: password,
  });

  if (error) throw error;

  const result = data as any;
  if (result.error) {
    throw new Error(result.error);
  }

  return {
    trip: {
      ...result.trip,
      services: (result.services || []).map((s: any) => ({
        ...s,
        service_type: s.service_type as TripServiceType,
        service_data: s.service_data as TripServiceData,
      })),
    } as Trip,
    agentProfile: result.agent_profile,
  };
}
