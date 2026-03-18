import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useEffect } from "react";
import type { SupportTicket, TicketMessage, TicketCategory, TicketStatus } from "@/types/support";

export function useSupportTickets() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  // Fetch tickets (user sees own, admin sees all)
  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase
        .from("support_tickets")
        .select("*")
        .order("last_message_at", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user!.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles for admin view
      if (isAdmin && data.length > 0) {
        const userIds = [...new Set(data.map((t: any) => t.user_id))];
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);

        const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);
        return data.map((t: any) => ({
          ...t,
          user_name: (profileMap.get(t.user_id) as any)?.name || "Usuário",
          user_avatar: (profileMap.get(t.user_id) as any)?.avatar_url || null,
        })) as SupportTicket[];
      }

      return data as SupportTicket[];
    },
    enabled: !!user,
  });

  // Create ticket
  const createTicket = useMutation({
    mutationFn: async (input: { subject: string; category: TicketCategory; content: string; attachmentUrls?: string[] }) => {
      // Create ticket
      const { data: ticket, error: ticketError } = await supabase
        .from("support_tickets")
        .insert({ user_id: user!.id, subject: input.subject, category: input.category })
        .select()
        .single();
      if (ticketError) throw ticketError;

      // Create first message
      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticket.id,
          sender_id: user!.id,
          content: input.content,
          is_admin: false,
          attachment_urls: input.attachmentUrls || [],
        });
      if (msgError) throw msgError;

      return ticket;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  // Update ticket status
  const updateStatus = useMutation({
    mutationFn: async ({ ticketId, status }: { ticketId: string; status: TicketStatus }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ status })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  // Update ticket tags
  const updateTags = useMutation({
    mutationFn: async ({ ticketId, tags }: { ticketId: string; tags: string[] }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ tags })
        .eq("id", ticketId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["support-tickets"] }),
  });

  // Realtime subscription for ticket updates
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("support-tickets-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => {
        queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  return { tickets, isLoading, createTicket, updateStatus, updateTags };
}

export function useTicketMessages(ticketId: string | null) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();
  const queryClient = useQueryClient();

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["ticket-messages", ticketId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ticket_messages")
        .select("*")
        .eq("ticket_id", ticketId!)
        .order("created_at", { ascending: true });
      if (error) throw error;

      // Fetch sender profiles
      const senderIds = [...new Set(data.map((m: any) => m.sender_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", senderIds);
      const profileMap = new Map(profiles?.map((p: any) => [p.user_id, p]) || []);

      return data.map((m: any) => ({
        ...m,
        sender_name: (profileMap.get(m.sender_id) as any)?.name || "Usuário",
        sender_avatar: (profileMap.get(m.sender_id) as any)?.avatar_url || null,
      })) as TicketMessage[];
    },
    enabled: !!ticketId && !!user,
  });

  // Send message
  const sendMessage = useMutation({
    mutationFn: async (input: { content: string; attachmentUrls?: string[] }) => {
      const { error: msgError } = await supabase
        .from("ticket_messages")
        .insert({
          ticket_id: ticketId!,
          sender_id: user!.id,
          content: input.content,
          is_admin: isAdmin,
          attachment_urls: input.attachmentUrls || [],
        });
      if (msgError) throw msgError;

      // Update last_message_at
      await supabase
        .from("support_tickets")
        .update({ last_message_at: new Date().toISOString() })
        .eq("id", ticketId!);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
    },
  });

  // Upload attachment
  const uploadAttachment = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop() || "file";
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `${ticketId}/${Date.now()}_${safeName}`;
    const { error } = await supabase.storage
      .from("ticket-attachments")
      .upload(path, file);
    if (error) throw error;
    const { data: urlData } = supabase.storage
      .from("ticket-attachments")
      .getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Mark messages as read
  const markAsRead = async () => {
    if (!ticketId || !user) return;
    await supabase
      .from("ticket_messages")
      .update({ read_at: new Date().toISOString() })
      .eq("ticket_id", ticketId)
      .neq("sender_id", user.id)
      .is("read_at", null);
  };

  // Realtime subscription for new messages
  useEffect(() => {
    if (!ticketId || !user) return;
    const channel = supabase
      .channel(`ticket-messages-${ticketId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "ticket_messages",
        filter: `ticket_id=eq.${ticketId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["ticket-messages", ticketId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [ticketId, user, queryClient]);

  return { messages, isLoading, sendMessage, uploadAttachment, markAsRead };
}

// Hook to get unread ticket count for notification badge
export function useUnreadTicketCount() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["unread-ticket-count", user?.id, isAdmin],
    queryFn: async () => {
      // For users: count messages from admin that are unread in their tickets
      // For admins: count messages from users that are unread
      let ticketIds: string[] = [];

      if (isAdmin) {
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("id")
          .neq("status", "resolvido");
        ticketIds = tickets?.map((t: any) => t.id) || [];
      } else {
        const { data: tickets } = await supabase
          .from("support_tickets")
          .select("id")
          .eq("user_id", user!.id);
        ticketIds = tickets?.map((t: any) => t.id) || [];
      }

      if (ticketIds.length === 0) return 0;

      const { count, error } = await supabase
        .from("ticket_messages")
        .select("*", { count: "exact", head: true })
        .in("ticket_id", ticketIds)
        .neq("sender_id", user!.id)
        .is("read_at", null);

      return count || 0;
    },
    enabled: !!user,
    refetchInterval: 30000, // Refresh every 30s
  });

  return unreadCount;
}
