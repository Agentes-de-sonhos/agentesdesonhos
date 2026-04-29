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
        .select("id, user_id, client_name, client_id, destination, start_date, end_date, status, share_token, access_password, slug, short_code, created_at, updated_at, is_locked, failed_password_attempts")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data as Trip[];
    },
    enabled: !!user,
    staleTime: 2 * 60 * 1000,
  });

  const createTripMutation = useMutation({
    mutationFn: async (formData: TripFormData) => {
      if (!user) throw new Error("User not authenticated");
      const array = new Uint8Array(16);
      crypto.getRandomValues(array);
      const shareToken = Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('');
      const password = generatePassword();

      const { data, error } = await supabase
        .from("trips")
        .insert({
          user_id: user.id,
          client_name: formData.client_name,
          client_id: formData.client_id || null,
          destination: formData.destination,
          start_date: formData.start_date,
          end_date: formData.end_date,
          status: "active",
          share_token: shareToken,
          access_password: password,
        } as any)
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

  const updateTripMutation = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TripFormData> & { status?: string }) => {
      if (!user) throw new Error("User not authenticated");

      // Get current trip to log changes
      const { data: current } = await supabase.from("trips").select("*").eq("id", id).single();

      const updateData: any = {};
      const historyEntries: { field_changed: string; old_value: string | null; new_value: string | null }[] = [];

      if (updates.client_name !== undefined && updates.client_name !== current?.client_name) {
        updateData.client_name = updates.client_name;
        historyEntries.push({ field_changed: "Nome do cliente", old_value: current?.client_name, new_value: updates.client_name });
      }
      if (updates.destination !== undefined && updates.destination !== current?.destination) {
        updateData.destination = updates.destination;
        historyEntries.push({ field_changed: "Destino", old_value: current?.destination, new_value: updates.destination });
      }
      if (updates.start_date !== undefined && updates.start_date !== current?.start_date) {
        updateData.start_date = updates.start_date;
        historyEntries.push({ field_changed: "Data de início", old_value: current?.start_date, new_value: updates.start_date });
      }
      if (updates.end_date !== undefined && updates.end_date !== current?.end_date) {
        updateData.end_date = updates.end_date;
        historyEntries.push({ field_changed: "Data de fim", old_value: current?.end_date, new_value: updates.end_date });
      }
      if (updates.status !== undefined && updates.status !== current?.status) {
        updateData.status = updates.status;
        historyEntries.push({ field_changed: "Status", old_value: current?.status, new_value: updates.status });
      }

      if (Object.keys(updateData).length === 0) return;

      const { error } = await supabase.from("trips").update(updateData).eq("id", id);
      if (error) throw error;

      // Log history
      if (historyEntries.length > 0) {
        await supabase.from("trip_edit_history").insert(
          historyEntries.map(h => ({ ...h, trip_id: id, user_id: user.id }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip"] });
      toast({ title: "Carteira atualizada", description: "Os dados da carteira foram atualizados." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
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
      const { error } = await supabase.from("trips").update({ access_password: password, failed_password_attempts: 0, is_locked: false } as any).eq("id", id);
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
      const { error } = await supabase.from("trips").update({ access_password: newPassword, failed_password_attempts: 0, is_locked: false } as any).eq("id", id);
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

  const unlockTripMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("trips")
        .update({ failed_password_attempts: 0, is_locked: false } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      queryClient.invalidateQueries({ queryKey: ["trip"] });
      toast({
        title: "Acesso desbloqueado",
        description: "O cliente já pode acessar a carteira novamente com a senha atual.",
      });
    },
    onError: (error) => {
      toast({ title: "Erro ao desbloquear", description: error.message, variant: "destructive" });
    },
  });

  return {
    trips,
    isLoading,
    createTrip: createTripMutation.mutateAsync,
    updateTrip: updateTripMutation.mutateAsync,
    deleteTrip: deleteTripMutation.mutateAsync,
    updatePassword: updatePasswordMutation.mutateAsync,
    regeneratePassword: regeneratePasswordMutation.mutateAsync,
    unlockTrip: unlockTripMutation.mutateAsync,
    isCreating: createTripMutation.isPending,
    isUpdating: updateTripMutation.isPending,
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
          attachments: (s.attachments as any[] || []) as import("@/types/trip").TripAttachment[],
        })),
      } as Trip;
    },
    enabled: !!id,
  });

  const { data: editHistory = [] } = useQuery({
    queryKey: ["trip-history", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("trip_edit_history")
        .select("*")
        .eq("trip_id", id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  const addServiceMutation = useMutation({
    mutationFn: async ({
      service_type, service_data, voucher_url, voucher_name, attachments,
    }: {
      service_type: TripServiceType;
      service_data: TripServiceData;
      voucher_url?: string;
      voucher_name?: string;
      attachments?: { url: string; name: string }[];
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
          attachments: (attachments || []) as any,
          order_index: nextOrderIndex,
        })
        .select()
        .single();
      if (error) throw error;

      // Log history
      if (user) {
        await supabase.from("trip_edit_history").insert({
          trip_id: id,
          user_id: user.id,
          field_changed: "Serviço adicionado",
          new_value: service_type,
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trip-history", id] });
      toast({ title: "Serviço adicionado", description: "O serviço foi adicionado à carteira." });
    },
    onError: (error) => {
      toast({ title: "Erro ao adicionar serviço", description: error.message, variant: "destructive" });
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async ({
      serviceId, service_data, voucher_url, voucher_name, attachments,
    }: {
      serviceId: string;
      service_data: TripServiceData;
      voucher_url?: string | null;
      voucher_name?: string | null;
      attachments?: { url: string; name: string }[];
    }) => {
      const updateData: any = { service_data: service_data as any };
      if (voucher_url !== undefined) updateData.voucher_url = voucher_url;
      if (voucher_name !== undefined) updateData.voucher_name = voucher_name;
      if (attachments !== undefined) updateData.attachments = attachments;

      const { error } = await supabase.from("trip_services").update(updateData).eq("id", serviceId);
      if (error) throw error;

      // Log history
      if (user && id) {
        const service = trip?.services?.find(s => s.id === serviceId);
        await supabase.from("trip_edit_history").insert({
          trip_id: id,
          user_id: user.id,
          field_changed: `Serviço atualizado (${service?.service_type || 'unknown'})`,
          new_value: "Dados atualizados",
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trip-history", id] });
      toast({ title: "Serviço atualizado", description: "O serviço foi atualizado com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar serviço", description: error.message, variant: "destructive" });
    },
  });

  const replaceVoucherMutation = useMutation({
    mutationFn: async ({ serviceId, file }: { serviceId: string; file: File }) => {
      if (!user || !id) throw new Error("Not authenticated");

      // Delete old voucher
      const service = trip?.services?.find(s => s.id === serviceId);
      if (service?.voucher_url) {
        const path = service.voucher_url.split('/vouchers/')[1];
        if (path) await supabase.storage.from("vouchers").remove([path]);
      }

      // Upload new
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${id}/${crypto.randomUUID()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from("vouchers").upload(fileName, file);
      if (uploadError) throw uploadError;
      const publicUrl = fileName; // Store path only, not public URL

      // Update service
      const { error } = await supabase.from("trip_services").update({
        voucher_url: publicUrl,
        voucher_name: file.name,
      }).eq("id", serviceId);
      if (error) throw error;

      // Log
      await supabase.from("trip_edit_history").insert({
        trip_id: id,
        user_id: user.id,
        field_changed: "Voucher substituído",
        old_value: service?.voucher_name || null,
        new_value: file.name,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trip-history", id] });
      toast({ title: "Voucher atualizado", description: "O arquivo foi substituído com sucesso." });
    },
    onError: (error) => {
      toast({ title: "Erro ao substituir voucher", description: error.message, variant: "destructive" });
    },
  });

  const removeVoucherMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      if (!user || !id) throw new Error("Not authenticated");

      const service = trip?.services?.find(s => s.id === serviceId);
      if (service?.voucher_url) {
        const path = service.voucher_url.split('/vouchers/')[1];
        if (path) await supabase.storage.from("vouchers").remove([path]);
      }

      const { error } = await supabase.from("trip_services").update({
        voucher_url: null,
        voucher_name: null,
      }).eq("id", serviceId);
      if (error) throw error;

      await supabase.from("trip_edit_history").insert({
        trip_id: id,
        user_id: user.id,
        field_changed: "Voucher removido",
        old_value: service?.voucher_name || null,
        new_value: null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trip-history", id] });
      toast({ title: "Voucher removido", description: "O arquivo foi removido." });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover voucher", description: error.message, variant: "destructive" });
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

      if (user && id) {
        await supabase.from("trip_edit_history").insert({
          trip_id: id,
          user_id: user.id,
          field_changed: "Serviço removido",
          old_value: service?.service_type || null,
          new_value: null,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      queryClient.invalidateQueries({ queryKey: ["trip-history", id] });
      toast({ title: "Serviço removido", description: "O serviço foi removido da carteira." });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover serviço", description: error.message, variant: "destructive" });
    },
  });

  const reorderServicesMutation = useMutation({
    mutationFn: async (orderedServiceIds: string[]) => {
      if (!id) throw new Error("Trip ID is required");
      // Update each service's order_index in parallel
      const updates = orderedServiceIds.map((sid, index) =>
        supabase.from("trip_services").update({ order_index: index }).eq("id", sid)
      );
      const results = await Promise.all(updates);
      const firstError = results.find((r) => r.error);
      if (firstError?.error) throw firstError.error;
    },
    onMutate: async (orderedServiceIds: string[]) => {
      await queryClient.cancelQueries({ queryKey: ["trip", id] });
      const previous = queryClient.getQueryData<any>(["trip", id]);
      if (previous?.services) {
        const map = new Map(previous.services.map((s: any) => [s.id, s]));
        const reordered = orderedServiceIds
          .map((sid, idx) => {
            const s = map.get(sid);
            return s ? { ...s, order_index: idx } : null;
          })
          .filter(Boolean);
        queryClient.setQueryData(["trip", id], { ...previous, services: reordered });
      }
      return { previous };
    },
    onError: (error, _vars, context: any) => {
      if (context?.previous) queryClient.setQueryData(["trip", id], context.previous);
      toast({ title: "Erro ao reordenar", description: error.message, variant: "destructive" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      toast({ title: "Ordem atualizada", description: "A nova sequência dos serviços foi salva." });
    },
  });

  const uploadVoucher = async (file: File): Promise<{ url: string; name: string }> => {
    if (!user) throw new Error("User not authenticated");
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${id}/${crypto.randomUUID()}.${fileExt}`;
    const { error } = await supabase.storage.from("vouchers").upload(fileName, file);
    if (error) throw error;
    return { url: fileName, name: file.name }; // Store path only
  };

  return {
    trip,
    isLoading,
    editHistory,
    addService: addServiceMutation.mutateAsync,
    updateService: updateServiceMutation.mutateAsync,
    deleteService: deleteServiceMutation.mutateAsync,
    replaceVoucher: replaceVoucherMutation.mutateAsync,
    removeVoucher: removeVoucherMutation.mutateAsync,
    uploadVoucher,
    reorderServices: reorderServicesMutation.mutate,
    isAddingService: addServiceMutation.isPending,
    isUpdatingService: updateServiceMutation.isPending,
    isReorderingServices: reorderServicesMutation.isPending,
  };
}

export function usePublicTrip(token: string | undefined) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-trip", token],
    queryFn: async () => {
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
