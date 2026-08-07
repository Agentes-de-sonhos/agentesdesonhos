import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { QuoteChoiceGroup, QuoteSelectionMode } from "@/types/quote";

/**
 * FASE 2 VIP — configuração de seleção de serviços do orçamento.
 *
 * Nada aqui altera o comportamento de agências sem o entitlement
 * `booking_requests`: os campos ficam em false/'optional' por padrão e a
 * ativação é validada por trigger no banco.
 */

export const SELECTION_MODE_LABELS: Record<QuoteSelectionMode, string> = {
  optional: "Opcional",
  required: "Obrigatório",
  alternative: "Alternativa",
  free: "Livre",
};

export const SELECTION_MODE_HINTS: Record<QuoteSelectionMode, string> = {
  optional: "O cliente pode incluir ou não este serviço.",
  required: "Sempre incluído no pedido de reserva.",
  alternative: "Faz parte de um grupo onde o cliente escolherá 1 opção.",
  free: "Faz parte de um grupo onde o cliente poderá escolher várias opções.",
};

export function useQuoteBookingConfig(quoteId?: string) {
  const queryClient = useQueryClient();
  const groupsKey = ["quote-choice-groups", quoteId];

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: groupsKey });
    queryClient.invalidateQueries({ queryKey: ["quote", quoteId] });
  };

  const { data: groups = [], isLoading } = useQuery({
    queryKey: groupsKey,
    enabled: !!quoteId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quote_service_choice_groups")
        .select("id, quote_id, user_id, title, group_type, min_select, max_select, order_index")
        .eq("quote_id", quoteId!)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as QuoteChoiceGroup[];
    },
  });

  const updateQuoteBooking = useMutation({
    mutationFn: async (payload: {
      booking_requests_enabled?: boolean;
      booking_disclaimer?: string;
      booking_deadline?: string | null;
    }) => {
      if (!quoteId) return;
      const { error } = await supabase.from("quotes").update(payload as any).eq("id", quoteId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const createGroup = useMutation({
    mutationFn: async (payload: { title: string; group_type: "alternative" | "free" }) => {
      if (!quoteId) throw new Error("Orçamento inválido");
      const isAlternative = payload.group_type === "alternative";
      const { data, error } = await supabase
        .from("quote_service_choice_groups")
        .insert({
          quote_id: quoteId,
          // user_id é normalizado no banco para o dono do orçamento
          user_id: "00000000-0000-0000-0000-000000000000",
          title: payload.title.trim(),
          group_type: payload.group_type,
          min_select: isAlternative ? 1 : 0,
          max_select: isAlternative ? 1 : null,
          order_index: groups.length,
        } as any)
        .select("id, quote_id, user_id, title, group_type, min_select, max_select, order_index")
        .single();
      if (error) throw error;
      return data as unknown as QuoteChoiceGroup;
    },
    onSuccess: invalidate,
  });

  const renameGroup = useMutation({
    mutationFn: async (payload: { id: string; title: string }) => {
      const { error } = await supabase
        .from("quote_service_choice_groups")
        .update({ title: payload.title.trim() } as any)
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  /** Grupo excluído devolve os serviços vinculados para 'optional' (trigger no banco). */
  const deleteGroup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quote_service_choice_groups").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const setServiceSelection = useMutation({
    mutationFn: async (payload: {
      serviceId: string;
      selection_mode: QuoteSelectionMode;
      choice_group_id?: string | null;
    }) => {
      const needsGroup =
        payload.selection_mode === "alternative" || payload.selection_mode === "free";
      if (needsGroup && !payload.choice_group_id) {
        throw new Error("Escolha ou crie um grupo para este serviço.");
      }
      const { error } = await supabase
        .from("quote_services")
        .update({
          selection_mode: payload.selection_mode,
          choice_group_id: needsGroup ? payload.choice_group_id : null,
        } as any)
        .eq("id", payload.serviceId);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return {
    groups,
    loadingGroups: isLoading,
    updateQuoteBooking,
    createGroup,
    renameGroup,
    deleteGroup,
    setServiceSelection,
  };
}
