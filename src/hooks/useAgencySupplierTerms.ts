import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export type SupplierTerms = {
  id: string;
  agency_id: string;
  operator_id: string;
  default_commission_type: "percentage" | "fixed" | null;
  default_commission_percent: number | null;
  default_commission_fixed: number | null;
  default_non_commissionable_fees: number | null;
  payment_rule: "after_sale" | "after_travel" | "after_invoice_issued" | "after_invoice_sent" | "manual" | null;
  payment_days: number | null;
  requires_invoice: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type SupplierTermsInput = Omit<
  Partial<SupplierTerms>,
  "id" | "agency_id" | "created_at" | "updated_at"
> & { operator_id: string };

/** All terms configured by the current agency, keyed by operator_id for fast lookup. */
export function useAgencySupplierTerms() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["agency_supplier_terms", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_supplier_terms")
        .select("*")
        .eq("agency_id", user!.id);
      if (error) throw error;
      const map = new Map<string, SupplierTerms>();
      (data || []).forEach((row: any) => map.set(row.operator_id, row as SupplierTerms));
      return { list: (data || []) as SupplierTerms[], byOperator: map };
    },
  });
}

export function useUpsertSupplierTerms() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async (input: SupplierTermsInput) => {
      if (!user?.id) throw new Error("Sessão expirada");
      // Só envia os campos informados: preserva valores históricos (ex.: taxas padrão antigas)
      // e a comissão geral antiga quando o formulário não a altera.
      const payload: Record<string, unknown> = { agency_id: user.id, operator_id: input.operator_id };
      (Object.keys(input) as (keyof SupplierTermsInput)[]).forEach((k) => {
        if (k === "operator_id" || input[k] === undefined) return;
        payload[k] = input[k];
      });
      if ("requires_invoice" in input) payload.requires_invoice = !!input.requires_invoice;
      const { data, error } = await supabase
        .from("agency_supplier_terms")
        .upsert(payload as any, { onConflict: "agency_id,operator_id" })
        .select()
        .single();
      if (error) throw error;
      return data as SupplierTerms;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["agency_supplier_terms"] });
      toast({ title: "Regras salvas", description: "Regras comerciais do fornecedor atualizadas." });
    },
    onError: (err: any) => {
      toast({ title: "Erro ao salvar", description: err.message || "Tente novamente.", variant: "destructive" });
    },
  });
}