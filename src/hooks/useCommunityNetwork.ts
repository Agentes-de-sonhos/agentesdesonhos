import { useCallback, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type NetworkRelationState =
  | "none"
  | "pending_sent"
  | "pending_received"
  | "accepted"
  | "rejected";

export interface NetworkConnection {
  id: string;
  requester_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
}

export interface NetworkRelation {
  state: NetworkRelationState;
  connectionId: string | null;
  otherUserId: string;
}

/** Deriva o estado da relação entre o usuário atual e outro usuário. */
export function resolveRelation(
  connections: NetworkConnection[],
  currentUserId: string | null | undefined,
  targetUserId: string,
): NetworkRelation {
  const base: NetworkRelation = { state: "none", connectionId: null, otherUserId: targetUserId };
  if (!currentUserId || currentUserId === targetUserId) return base;

  const connection = connections.find(
    (item) =>
      (item.requester_id === currentUserId && item.receiver_id === targetUserId) ||
      (item.receiver_id === currentUserId && item.requester_id === targetUserId),
  );
  if (!connection) return base;

  if (connection.status === "accepted") {
    return { state: "accepted", connectionId: connection.id, otherUserId: targetUserId };
  }
  if (connection.status === "rejected") {
    return { state: "rejected", connectionId: connection.id, otherUserId: targetUserId };
  }
  return {
    state: connection.requester_id === currentUserId ? "pending_sent" : "pending_received",
    connectionId: connection.id,
    otherUserId: targetUserId,
  };
}

/** Filtro do par de usuários, cobrindo remetente e destinatário invertidos. */
export function pairFilter(userId: string, targetUserId: string): string {
  return `and(requester_id.eq.${userId},receiver_id.eq.${targetUserId}),and(requester_id.eq.${targetUserId},receiver_id.eq.${userId})`;
}

/** Lista de ids de autores cujas publicações futuras devem ficar fora do feed. */
export function mutedAuthorIds(rows: { author_id: string }[] | undefined | null): string[] {
  return [...new Set((rows ?? []).map((row) => row.author_id))];
}

/**
 * Rede social da Comunidade do Agentes de Sonhos: conexões e acompanhamento
 * (seguir/parar de seguir) são conceitos separados.
 */
export function useCommunityNetwork() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const userId = user?.id ?? null;

  const connectionsQuery = useQuery({
    queryKey: ["community-network-connections", userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connections")
        .select("id, requester_id, receiver_id, status, created_at")
        .or(`requester_id.eq.${userId},receiver_id.eq.${userId}`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as NetworkConnection[];
    },
  });

  const mutedQuery = useQuery({
    queryKey: ["community-muted-authors", userId],
    enabled: !!userId,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_muted_authors")
        .select("author_id")
        .eq("user_id", userId!);
      if (error) throw error;
      return (data ?? []) as { author_id: string }[];
    },
  });

  const connections = connectionsQuery.data ?? [];
  const mutedAuthors = useMemo(() => mutedAuthorIds(mutedQuery.data), [mutedQuery.data]);

  const invalidateConnections = () => {
    queryClient.invalidateQueries({ queryKey: ["community-network-connections"] });
    queryClient.invalidateQueries({ queryKey: ["connections"] });
  };

  const sendRequest = useMutation({
    mutationFn: async (targetUserId: string) => {
      if (!userId) throw new Error("Não autenticado");
      if (userId === targetUserId) throw new Error("Não é possível conectar consigo mesmo");
      // Uma recusa anterior (linha legada com status "rejected") não pode impedir
      // uma nova solicitação: a linha do par é limpa antes de inserir a nova.
      const { error: cleanupError } = await supabase
        .from("connections")
        .delete()
        .eq("status", "rejected")
        .or(pairFilter(userId, targetUserId));
      if (cleanupError) throw cleanupError;
      const { error } = await supabase
        .from("connections")
        .insert({ requester_id: userId, receiver_id: targetUserId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateConnections();
      toast.success("Solicitação de conexão enviada");
    },
    onError: () => toast.error("Não foi possível enviar a solicitação"),
  });

  const cancelRequest = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase.from("connections").delete().eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateConnections();
      toast.success("Solicitação cancelada");
    },
    onError: () => toast.error("Não foi possível cancelar a solicitação"),
  });

  const respondRequest = useMutation({
    mutationFn: async ({ connectionId, accept }: { connectionId: string; accept: boolean }) => {
      if (!accept) {
        // Recusar remove a solicitação pendente, liberando uma nova tentativa
        // sem colidir com a prevenção de pares duplicados/invertidos.
        const { error: rejectError } = await supabase
          .from("connections")
          .delete()
          .eq("id", connectionId);
        if (rejectError) throw rejectError;
        return;
      }
      const { error } = await supabase
        .from("connections")
        .update({ status: "accepted", updated_at: new Date().toISOString() })
        .eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      invalidateConnections();
      if (variables.accept) {
        // A conexão aceita começa seguindo nos dois sentidos (garantido no banco).
        queryClient.invalidateQueries({ queryKey: ["community-muted-authors"] });
        queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      }
      toast.success(variables.accept ? "Conexão aceita" : "Solicitação recusada");
    },
    onError: () => toast.error("Não foi possível responder à solicitação"),
  });

  const removeConnection = useMutation({
    mutationFn: async (connectionId: string) => {
      const { error } = await supabase.from("connections").delete().eq("id", connectionId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidateConnections();
      toast.success("Conexão removida");
    },
    onError: () => toast.error("Não foi possível remover a conexão"),
  });

  const setFollowing = useMutation({
    mutationFn: async ({ authorId, following }: { authorId: string; following: boolean }) => {
      if (!userId) throw new Error("Não autenticado");
      if (following) {
        const { error } = await supabase
          .from("community_muted_authors")
          .delete()
          .eq("user_id", userId)
          .eq("author_id", authorId);
        if (error) throw error;
        return;
      }
      const { error } = await supabase
        .from("community_muted_authors")
        .insert({ user_id: userId, author_id: authorId });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["community-muted-authors"] });
      queryClient.invalidateQueries({ queryKey: ["community-feed"] });
      toast.success(variables.following ? "Você voltou a seguir" : "Você parou de seguir");
    },
    onError: () => toast.error("Não foi possível atualizar o acompanhamento"),
  });

  const getRelation = useCallback(
    (targetUserId: string) => resolveRelation(connections, userId, targetUserId),
    [connections, userId],
  );

  const isFollowing = useCallback(
    (authorId: string) => !mutedAuthors.includes(authorId),
    [mutedAuthors],
  );

  return {
    currentUserId: userId,
    connections,
    acceptedConnections: connections.filter((item) => item.status === "accepted"),
    pendingReceived: connections.filter(
      (item) => item.status === "pending" && item.receiver_id === userId,
    ),
    pendingSent: connections.filter(
      (item) => item.status === "pending" && item.requester_id === userId,
    ),
    mutedAuthors,
    isLoading: connectionsQuery.isLoading,
    isError: connectionsQuery.isError,
    refetch: connectionsQuery.refetch,
    getRelation,
    isFollowing,
    sendRequest: sendRequest.mutate,
    cancelRequest: cancelRequest.mutate,
    respondRequest: respondRequest.mutate,
    removeConnection: removeConnection.mutate,
    setFollowing: setFollowing.mutate,
    isMutating:
      sendRequest.isPending ||
      cancelRequest.isPending ||
      respondRequest.isPending ||
      removeConnection.isPending,
    isUpdatingFollow: setFollowing.isPending,
  };
}
