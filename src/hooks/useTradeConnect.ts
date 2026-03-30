import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface TradeProfile {
  user_id: string;
  name: string;
  avatar_url: string | null;
  agency_name: string | null;
  agency_logo_url: string | null;
  city: string | null;
  state: string | null;
  bio: string | null;
  specialties: string[];
  services: string[];
  niches: string[];
  niche: string | null;
  years_in_business: number | null;
  phone: string | null;
  help_offer: string | null;
  partnership_interests: string[];
}

export type ConnectionStatus = "none" | "pending_sent" | "pending_received" | "accepted" | "rejected";

export interface Connection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  profile?: TradeProfile;
}

const PROFILE_SELECT = "user_id, name, avatar_url, agency_name, agency_logo_url, city, state, bio, specialties, services, niches, niche, years_in_business, phone, help_offer, partnership_interests";

export function useTradeProfile() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["trade-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select(PROFILE_SELECT)
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data as TradeProfile | null;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  const profileCompleteness = (() => {
    if (!profile) return 0;
    const fields = [
      !!profile.name,
      !!profile.avatar_url,
      !!profile.agency_name,
      !!profile.agency_logo_url,
      !!profile.city,
      !!profile.state,
      !!profile.bio,
      (profile.specialties?.length || 0) > 0,
      (profile.services?.length || 0) > 0,
      (profile.niches?.length || 0) > 0,
      !!profile.years_in_business,
      !!profile.phone,
      !!profile.help_offer,
      (profile.partnership_interests?.length || 0) > 0,
    ];
    return Math.round((fields.filter(Boolean).length / fields.length) * 100);
  })();

  return { profile, isLoading, profileCompleteness };
}

export function useUpdateTradeProfile() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Omit<TradeProfile, "user_id">>) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("profiles")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trade-profile"] });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Perfil atualizado com sucesso!");
    },
    onError: () => {
      toast.error("Erro ao atualizar perfil");
    },
  });
}

export function useConnections() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: connections = [], isLoading } = useQuery({
    queryKey: ["connections", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("connections")
        .select("*")
        .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Connection[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });

  const getConnectionStatus = (targetUserId: string): ConnectionStatus => {
    if (!user?.id) return "none";
    const conn = connections.find(
      (c) =>
        (c.requester_id === user.id && c.receiver_id === targetUserId) ||
        (c.receiver_id === user.id && c.requester_id === targetUserId)
    );
    if (!conn) return "none";
    if (conn.status === "accepted") return "accepted";
    if (conn.status === "rejected") return "rejected";
    if (conn.requester_id === user.id) return "pending_sent";
    return "pending_received";
  };

  const getConnectionId = (targetUserId: string): string | null => {
    if (!user?.id) return null;
    const conn = connections.find(
      (c) =>
        (c.requester_id === user.id && c.receiver_id === targetUserId) ||
        (c.receiver_id === user.id && c.requester_id === targetUserId)
    );
    return conn?.id || null;
  };

  const sendRequest = useMutation({
    mutationFn: async (receiverId: string) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase.from("connections").insert({
        requester_id: user.id,
        receiver_id: receiverId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Solicitação de conexão enviada!");
    },
    onError: () => toast.error("Erro ao enviar solicitação"),
  });

  const respondRequest = useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: string; accept: boolean }) => {
      const { error } = await supabase
        .from("connections")
        .update({ status: accept ? "accepted" : "rejected" })
        .eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success(vars.accept ? "Conexão aceita!" : "Conexão recusada");
    },
    onError: () => toast.error("Erro ao responder solicitação"),
  });

  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase.from("connections").delete().eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["connections"] });
      toast.success("Conexão removida");
    },
    onError: () => toast.error("Erro ao remover conexão"),
  });

  const acceptedConnections = connections.filter((c) => c.status === "accepted");
  const pendingReceived = connections.filter(
    (c) => c.status === "pending" && c.receiver_id === user?.id
  );

  return {
    connections,
    acceptedConnections,
    pendingReceived,
    isLoading,
    getConnectionStatus,
    getConnectionId,
    sendRequest: sendRequest.mutate,
    respondRequest: respondRequest.mutate,
    removeConnection: removeConnection.mutate,
    isSending: sendRequest.isPending,
  };
}
