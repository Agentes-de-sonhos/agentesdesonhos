import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";

export type TradeEventStatus = "pendente" | "aprovado" | "recusado";
export type TradeEventType =
  | "treinamento" | "evento" | "roadshow" | "live" | "famtour"
  | "reuniao" | "capacitacao" | "encontro" | "outro";

export interface TradeEvent {
  id: string;
  supplier_user_id: string;
  operator_id: string | null;
  title: string;
  description: string | null;
  event_type: TradeEventType;
  start_at: string;
  end_at: string | null;
  location: string | null;
  link: string | null;
  cover_url: string | null;
  status: TradeEventStatus;
  rejection_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export type TradeEventInput = Omit<
  TradeEvent,
  "id" | "supplier_user_id" | "status" | "rejection_reason" |
  "reviewed_by" | "reviewed_at" | "created_at" | "updated_at"
>;

export function useMyTradeEvents() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["trade-events", "mine", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_events")
        .select("*")
        .eq("supplier_user_id", user!.id)
        .order("start_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TradeEvent[];
    },
    enabled: !!user,
    staleTime: 60_000,
  });
}

export function useApprovedTradeEvents(limit = 20) {
  return useQuery({
    queryKey: ["trade-events", "approved", limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_events")
        .select("*")
        .eq("status", "aprovado")
        .gte("start_at", new Date().toISOString())
        .order("start_at", { ascending: true })
        .limit(limit);
      if (error) throw error;
      return (data || []) as TradeEvent[];
    },
    staleTime: 5 * 60_000,
  });
}

export function useAdminTradeEvents() {
  return useQuery({
    queryKey: ["trade-events", "admin"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_events")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as TradeEvent[];
    },
    staleTime: 30_000,
  });
}

export function useTradeEventMutations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: async (input: TradeEventInput) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("trade_events")
        .insert({ ...input, supplier_user_id: user.id, status: "pendente" })
        .select()
        .single();
      if (error) throw error;
      return data as TradeEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-events"] });
      toast.success("Evento enviado para aprovação");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar evento"),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & Partial<TradeEventInput>) => {
      const { data, error } = await supabase
        .from("trade_events")
        .update({ ...input, status: "pendente", rejection_reason: null })
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as TradeEvent;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-events"] });
      toast.success("Evento atualizado e reenviado para aprovação");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar evento"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trade_events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-events"] });
      toast.success("Evento removido");
    },
  });

  const review = useMutation({
    mutationFn: async ({
      id,
      status,
      rejection_reason,
    }: { id: string; status: TradeEventStatus; rejection_reason?: string }) => {
      const { error } = await supabase
        .from("trade_events")
        .update({
          status,
          rejection_reason: status === "recusado" ? rejection_reason || "Não informado" : null,
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["trade-events"] });
      toast.success("Evento moderado");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao moderar"),
  });

  return { create, update, remove, review };
}