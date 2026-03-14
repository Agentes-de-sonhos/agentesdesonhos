import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { toast } from "sonner";

export interface CommunityRoom {
  id: string;
  name: string;
  emoji: string;
  description: string | null;
  is_general: boolean;
  is_active: boolean;
  order_index: number;
}

export interface RoomMessage {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export function useCommunityChat(activeRoomId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch rooms
  const { data: rooms = [], isLoading: loadingRooms } = useQuery({
    queryKey: ["community-rooms"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_rooms")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as CommunityRoom[];
    },
  });

  // Fetch messages for active room
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["room-messages", activeRoomId],
    queryFn: async () => {
      if (!activeRoomId) return [];

      const { data: msgs, error } = await (supabase as any)
        .from("community_messages")
        .select("*")
        .eq("room_id", activeRoomId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set(msgs.map((m: any) => m.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds as string[]);

      return msgs.map((msg: any) => ({
        ...msg,
        profile: profiles?.find((p) => p.user_id === msg.user_id) || undefined,
      })) as RoomMessage[];
    },
    enabled: !!activeRoomId,
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ roomId, content }: { roomId: string; content: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await (supabase as any)
        .from("community_messages")
        .insert({ room_id: roomId, user_id: user.id, content });
      if (error) throw error;
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });

  // Realtime for room messages
  useEffect(() => {
    if (!activeRoomId) return;

    const channel = supabase
      .channel(`room-${activeRoomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "community_messages",
          filter: `room_id=eq.${activeRoomId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["room-messages", activeRoomId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeRoomId, queryClient]);

  // Online count per room (based on recent messages)
  const { data: roomOnlineCounts = {} } = useQuery({
    queryKey: ["room-online-counts"],
    queryFn: async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { data } = await (supabase as any)
        .from("user_presence")
        .select("user_id")
        .gte("last_active_at", fiveMinAgo);
      // Return total online count for now
      return { total: data?.length || 0 } as Record<string, number>;
    },
    refetchInterval: 30000,
  });

  return {
    rooms,
    messages,
    loadingRooms,
    loadingMessages,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    roomOnlineCounts,
  };
}
