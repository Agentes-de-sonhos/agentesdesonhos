import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useEffect } from "react";
import { toast } from "sonner";
import { playNotificationSound } from "@/lib/notification-sound";

export interface Conversation {
  id: string;
  other_user: {
    user_id: string;
    name: string;
    avatar_url: string | null;
  };
  last_message_at: string;
  unread_count: number;
}

export interface DirectMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read_at: string | null;
  created_at: string;
  profile?: {
    name: string;
    avatar_url: string | null;
  };
}

export function useDirectMessages(activeConversationId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fetch conversations
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ["dm-conversations", user?.id],
    queryFn: async () => {
      if (!user) return [];

      const { data, error } = await (supabase as any)
        .from("direct_conversations")
        .select("*")
        .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
        .order("last_message_at", { ascending: false });

      if (error) throw error;
      if (!data || data.length === 0) return [];

      // Get other user IDs
      const otherUserIds = data.map((c: any) =>
        c.user_a === user.id ? c.user_b : c.user_a
      );

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", otherUserIds);

      // Get unread counts
      const convIds = data.map((c: any) => c.id);
      const { data: unreadData } = await (supabase as any)
        .from("direct_messages")
        .select("conversation_id")
        .in("conversation_id", convIds)
        .neq("sender_id", user.id)
        .is("read_at", null);

      const unreadMap: Record<string, number> = {};
      (unreadData || []).forEach((m: any) => {
        unreadMap[m.conversation_id] = (unreadMap[m.conversation_id] || 0) + 1;
      });

      return data.map((conv: any) => {
        const otherUserId = conv.user_a === user.id ? conv.user_b : conv.user_a;
        const profile = profiles?.find((p) => p.user_id === otherUserId);
        return {
          id: conv.id,
          other_user: {
            user_id: otherUserId,
            name: profile?.name || "Agente",
            avatar_url: profile?.avatar_url || null,
          },
          last_message_at: conv.last_message_at,
          unread_count: unreadMap[conv.id] || 0,
        };
      }) as Conversation[];
    },
    enabled: !!user,
  });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["dm-messages", activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];

      const { data: msgs, error } = await (supabase as any)
        .from("direct_messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true })
        .limit(100);

      if (error) throw error;

      const userIds = [...new Set(msgs.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds as string[]);

      return msgs.map((msg: any) => ({
        ...msg,
        profile: profiles?.find((p) => p.user_id === msg.sender_id) || undefined,
      })) as DirectMessage[];
    },
    enabled: !!activeConversationId,
  });

  // Mark messages as read
  useEffect(() => {
    if (!activeConversationId || !user) return;

    const markRead = async () => {
      await (supabase as any)
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("conversation_id", activeConversationId)
        .neq("sender_id", user.id)
        .is("read_at", null);

      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    };

    markRead();
  }, [activeConversationId, user, queryClient]);

  // Send message
  const sendMessage = useMutation({
    mutationFn: async ({
      conversationId,
      content,
    }: {
      conversationId: string;
      content: string;
    }) => {
      if (!user) throw new Error("Não autenticado");

      const { error } = await (supabase as any)
        .from("direct_messages")
        .insert({
          conversation_id: conversationId,
          sender_id: user.id,
          content,
        });
      if (error) throw error;

      // Update last_message_at
      await (supabase as any)
        .from("direct_conversations")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    },
    onError: () => {
      toast.error("Erro ao enviar mensagem");
    },
  });

  // Start new conversation
  const startConversation = useMutation({
    mutationFn: async (otherUserId: string) => {
      if (!user) throw new Error("Não autenticado");

      // Check if conversation exists (either direction)
      const { data: existing } = await (supabase as any)
        .from("direct_conversations")
        .select("id")
        .or(
          `and(user_a.eq.${user.id},user_b.eq.${otherUserId}),and(user_a.eq.${otherUserId},user_b.eq.${user.id})`
        )
        .maybeSingle();

      if (existing) return existing.id as string;

      // Create new
      const { data, error } = await (supabase as any)
        .from("direct_conversations")
        .insert({
          user_a: user.id,
          user_b: otherUserId,
        })
        .select("id")
        .single();

      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
    },
    onError: () => {
      toast.error("Erro ao iniciar conversa");
    },
  });

  // Realtime for DMs
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`dm-${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "direct_messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["dm-messages", activeConversationId],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, queryClient]);

  // Global realtime for new DM notifications
  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel("dm-notifications")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload: any) => {
          if (payload.new.sender_id !== user.id) {
            playNotificationSound();
            queryClient.invalidateQueries({ queryKey: ["dm-conversations"] });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread_count, 0);

  return {
    conversations,
    messages,
    loadingConversations,
    loadingMessages,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    startConversation: startConversation.mutateAsync,
    isStarting: startConversation.isPending,
    totalUnread,
  };
}
