import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface TravelerVisa {
  id: string;
  traveler_id: string;
  user_id: string;
  tipo: string;
  numero: string | null;
  data_vencimento: string | null;
  observacoes: string | null
  created_at: string;
  updated_at: string;
}

export interface TravelerVisaInput {
  tipo: string;
  numero?: string | null;
  data_vencimento?: string | null;
  observacoes?: string | null;
}

export function useTravelerVisas(travelerId: string) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: visas = [], isLoading } = useQuery({
    queryKey: ["traveler-visas", travelerId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("traveler_visas")
        .select("*")
        .eq("traveler_id", travelerId)
        .order("data_vencimento", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as TravelerVisa[];
    },
    enabled: !!travelerId,
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["traveler-visas", travelerId] });
    qc.invalidateQueries({ queryKey: ["document-expiry-radar"] });
  };

  const createVisa = useMutation({
    mutationFn: async (input: TravelerVisaInput) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("traveler_visas").insert({
        traveler_id: travelerId,
        user_id: user.id,
        tipo: input.tipo,
        numero: input.numero || null,
        data_vencimento: input.data_vencimento || null,
        observacoes: input.observacoes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Visto adicionado" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao adicionar visto", description: e.message, variant: "destructive" }),
  });

  const updateVisa = useMutation({
    mutationFn: async ({ id, ...input }: TravelerVisaInput & { id: string }) => {
      const { error } = await supabase
        .from("traveler_visas")
        .update({
          tipo: input.tipo,
          numero: input.numero || null,
          data_vencimento: input.data_vencimento || null,
          observacoes: input.observacoes || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Visto atualizado" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao atualizar visto", description: e.message, variant: "destructive" }),
  });

  const deleteVisa = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("traveler_visas").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Visto removido" });
    },
    onError: (e: Error) =>
      toast({ title: "Erro ao remover visto", description: e.message, variant: "destructive" }),
  });

  return {
    visas,
    isLoading,
    createVisa: createVisa.mutateAsync,
    updateVisa: updateVisa.mutateAsync,
    deleteVisa: deleteVisa.mutateAsync,
    isSaving: createVisa.isPending || updateVisa.isPending,
  };
}

export interface ExpiringDocument {
  id: string;
  kind: "passaporte" | "visto";
  documentLabel: string;
  numero: string | null;
  data_vencimento: string;
  travelerId: string;
  travelerName: string;
  clientId: string | null;
  clientName: string;
  clientPhone: string | null;
}

interface TravelerRow {
  id: string;
  nome_completo: string;
  passaporte: string | null;
  validade_passaporte: string | null;
  client_id: string | null;
  clients: { id: string; name: string; phone: string | null } | null;
}

interface VisaRow extends Omit<TravelerVisa, "user_id"> {
  travelers: TravelerRow | null;
}

/** Radar de validades: consolida passaportes e vistos com data de vencimento. */
export function useDocumentExpiryRadar() {
  return useQuery({
    queryKey: ["document-expiry-radar"],
    queryFn: async (): Promise<ExpiringDocument[]> => {
      const [travelersRes, visasRes] = await Promise.all([
        supabase
          .from("travelers")
          .select("id, nome_completo, passaporte, validade_passaporte, client_id, clients(id, name, phone)")
          .not("validade_passaporte", "is", null),
        supabase
          .from("traveler_visas")
          .select(
            "id, traveler_id, tipo, numero, data_vencimento, observacoes, created_at, updated_at, travelers(id, nome_completo, passaporte, validade_passaporte, client_id, clients(id, name, phone))"
          )
          .not("data_vencimento", "is", null),
      ]);
      if (travelersRes.error) throw travelersRes.error;
      if (visasRes.error) throw visasRes.error;

      const items: ExpiringDocument[] = [];

      for (const t of (travelersRes.data ?? []) as unknown as TravelerRow[]) {
        if (!t.validade_passaporte) continue;
        items.push({
          id: `passport-${t.id}`,
          kind: "passaporte",
          documentLabel: "Passaporte",
          numero: t.passaporte,
          data_vencimento: t.validade_passaporte,
          travelerId: t.id,
          travelerName: t.nome_completo,
          clientId: t.client_id,
          clientName: t.clients?.name ?? "Cliente",
          clientPhone: t.clients?.phone ?? null,
        });
      }

      for (const v of (visasRes.data ?? []) as unknown as VisaRow[]) {
        if (!v.data_vencimento) continue;
        const t = v.travelers;
        items.push({
          id: `visa-${v.id}`,
          kind: "visto",
          documentLabel: v.tipo,
          numero: v.numero,
          data_vencimento: v.data_vencimento,
          travelerId: v.traveler_id,
          travelerName: t?.nome_completo ?? "Viajante",
          clientId: t?.client_id ?? null,
          clientName: t?.clients?.name ?? "Cliente",
          clientPhone: t?.clients?.phone ?? null,
        });
      }

      return items.sort((a, b) => a.data_vencimento.localeCompare(b.data_vencimento));
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
