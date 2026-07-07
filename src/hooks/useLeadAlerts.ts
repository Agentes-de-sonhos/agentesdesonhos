import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type LeadSource = "conversational" | "sales_landing";

export interface LeadItem {
  id: string;
  source: LeadSource;
  source_label: string;
  lead_name: string;
  lead_phone: string;
  destination: string | null;
  is_read: boolean;
  attended_at: string | null;
  whatsapp_message: string | null;
  created_at: string;
}

const SOURCE_LABEL: Record<LeadSource, string> = {
  conversational: "Formulário Conversacional",
  sales_landing: "Página de Vendas",
};

export function useLeads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["leads-unified", user?.id],
    queryFn: async (): Promise<LeadItem[]> => {
      if (!user?.id) return [];
      const [convRes, landingRes] = await Promise.all([
        supabase
          .from("lead_captures")
          .select("id, lead_name, lead_phone, destination, is_read, attended_at, whatsapp_message, created_at")
          .eq("agent_user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("sales_landing_leads")
          .select("id, lead_name, lead_phone, is_read, attended_at, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);
      if (convRes.error) throw convRes.error;
      if (landingRes.error) throw landingRes.error;
      const conv: LeadItem[] = (convRes.data ?? []).map((l: any) => ({
        id: l.id,
        source: "conversational",
        source_label: SOURCE_LABEL.conversational,
        lead_name: l.lead_name,
        lead_phone: l.lead_phone,
        destination: l.destination,
        is_read: !!l.is_read,
        attended_at: l.attended_at,
        whatsapp_message: l.whatsapp_message,
        created_at: l.created_at,
      }));
      const landing: LeadItem[] = (landingRes.data ?? []).map((l: any) => ({
        id: l.id,
        source: "sales_landing",
        source_label: SOURCE_LABEL.sales_landing,
        lead_name: l.lead_name,
        lead_phone: l.lead_phone,
        destination: null,
        is_read: !!l.is_read,
        attended_at: l.attended_at,
        whatsapp_message: null,
        created_at: l.created_at,
      }));
      return [...conv, ...landing].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60,
    refetchOnWindowFocus: false,
  });
}

export function useLeadStats() {
  const { data: leads = [] } = useLeads();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const novos = leads.filter((l) => !l.is_read).length;
  const semInteracao = leads.filter((l) => !l.attended_at).length;
  const atendidosHoje = leads.filter(
    (l) => l.attended_at && new Date(l.attended_at).getTime() >= startOfToday.getTime()
  ).length;
  return { total: leads.length, novos, semInteracao, atendidosHoje, recent: leads.slice(0, 5) };
}

export function useMarkLeadRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (lead: Pick<LeadItem, "id" | "source">) => {
      const table = lead.source === "conversational" ? "lead_captures" : "sales_landing_leads";
      const { error } = await supabase.from(table).update({ is_read: true }).eq("id", lead.id);
      if (error) throw error;
    },
    onMutate: async (lead) => {
      const queryKey = ["leads-unified", user?.id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<LeadItem[]>(queryKey);
      qc.setQueryData<LeadItem[]>(queryKey, (old = []) =>
        old.map((item) =>
          item.id === lead.id && item.source === lead.source ? { ...item, is_read: true } : item
        )
      );
      return { previous };
    },
    onError: (_error, _lead, context) => {
      if (context?.previous) {
        qc.setQueryData(["leads-unified", user?.id], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["leads-unified", user?.id] });
    },
  });
}

export function useMarkLeadAttended() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (lead: Pick<LeadItem, "id" | "source">) => {
      const table = lead.source === "conversational" ? "lead_captures" : "sales_landing_leads";
      const { error } = await supabase
        .from(table)
        .update({ is_read: true, attended_at: new Date().toISOString() })
        .eq("id", lead.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads-unified", user?.id] });
    },
  });
}

export function useMarkAllLeadsRead() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async () => {
      if (!user?.id) return;
      const [convRes, landingRes] = await Promise.all([
        supabase.from("lead_captures").update({ is_read: true }).eq("agent_user_id", user.id).eq("is_read", false),
        supabase.from("sales_landing_leads").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false),
      ]);
      if (convRes.error) throw convRes.error;
      if (landingRes.error) throw landingRes.error;
    },
    onMutate: async () => {
      const queryKey = ["leads-unified", user?.id];
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<LeadItem[]>(queryKey);
      qc.setQueryData<LeadItem[]>(queryKey, (old = []) =>
        old.map((item) => ({ ...item, is_read: true }))
      );
      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (context?.previous) {
        qc.setQueryData(["leads-unified", user?.id], context.previous);
      }
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["leads-unified", user?.id] });
    },
  });
}

/**
 * Subscribes to realtime INSERT events for both lead tables and triggers a callback per new lead.
 * Also invalidates the unified leads query so counters/cards refresh automatically.
 */
export function useLeadRealtime(onNewLead: (lead: LeadItem) => void) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const cbRef = useRef(onNewLead);
  cbRef.current = onNewLead;

  useEffect(() => {
    if (!user?.id) return;
    // Shared subscription across all NewLeadAlertProvider instances (one per
    // workspace tab). The Supabase channel is opened by the first subscriber
    // and torn down only after the last subscriber unmounts, so closing the
    // originating tab no longer kills alerts for the remaining tabs.
    const subscriber = (lead: LeadItem) => cbRef.current(lead);
    subscribeLeadRealtime(user.id, subscriber, qc);
    return () => {
      unsubscribeLeadRealtime(user.id, subscriber);
    };
  }, [user?.id, qc]);
}

// Module-level shared channel: one Supabase realtime channel per user.id,
// fanning out INSERT events to every mounted subscriber.
type LeadSubscriber = (lead: LeadItem) => void;
let sharedChannel: ReturnType<typeof supabase.channel> | null = null;
let sharedOwnerId: string | null = null;
const sharedSubscribers = new Set<LeadSubscriber>();

function subscribeLeadRealtime(
  userId: string,
  subscriber: LeadSubscriber,
  qc: ReturnType<typeof useQueryClient>
) {
  if (sharedOwnerId && sharedOwnerId !== userId) {
    // User changed — tear the previous channel down before opening a new one.
    if (sharedChannel) supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    sharedOwnerId = null;
    sharedSubscribers.clear();
  }
  sharedSubscribers.add(subscriber);
  if (sharedChannel) return;

  sharedOwnerId = userId;
  sharedChannel = supabase
    .channel(`leads-realtime-${userId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "lead_captures",
        filter: `agent_user_id=eq.${userId}`,
      },
      (payload) => {
        const row: any = payload.new;
        const lead: LeadItem = {
          id: row.id,
          source: "conversational",
          source_label: SOURCE_LABEL.conversational,
          lead_name: row.lead_name,
          lead_phone: row.lead_phone,
          destination: row.destination,
          is_read: !!row.is_read,
          attended_at: row.attended_at,
          whatsapp_message: row.whatsapp_message,
          created_at: row.created_at,
        };
        // Only the first subscriber receives the popup/chime; the rest still
        // exist so query invalidation runs once, keeping counters fresh.
        const first = sharedSubscribers.values().next().value as LeadSubscriber | undefined;
        first?.(lead);
        qc.invalidateQueries({ queryKey: ["leads-unified", userId] });
      }
    )
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "sales_landing_leads",
        filter: `user_id=eq.${userId}`,
      },
      (payload) => {
        const row: any = payload.new;
        const lead: LeadItem = {
          id: row.id,
          source: "sales_landing",
          source_label: SOURCE_LABEL.sales_landing,
          lead_name: row.lead_name,
          lead_phone: row.lead_phone,
          destination: null,
          is_read: !!row.is_read,
          attended_at: row.attended_at,
          whatsapp_message: null,
          created_at: row.created_at,
        };
        const first = sharedSubscribers.values().next().value as LeadSubscriber | undefined;
        first?.(lead);
        qc.invalidateQueries({ queryKey: ["leads-unified", userId] });
      }
    )
    .subscribe();
}

function unsubscribeLeadRealtime(userId: string, subscriber: LeadSubscriber) {
  sharedSubscribers.delete(subscriber);
  if (sharedSubscribers.size === 0 && sharedChannel) {
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
    sharedOwnerId = null;
  }
}