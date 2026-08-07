import { useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { mapServiceDataToOperationService } from "@/lib/operationServiceMap";

export interface OperationService {
  id: string;
  operation_id: string;
  user_id: string;
  source_quote_service_id: string | null;
  service_type: string;
  name: string;
  supplier: string | null;
  destination: string | null;
  start_date: string | null;
  end_date: string | null;
  amount: number;
  notes: string | null;
  service_data: Record<string, any>;
  is_confirmed: boolean;
  is_paid: boolean;
  is_issued: boolean;
  is_delivered: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export type OperationServiceFlag = "is_confirmed" | "is_paid" | "is_issued" | "is_delivered";

interface Args {
  operationId: string | null;
  quoteId?: string | null;
  opportunityId?: string | null;
  enabled?: boolean;
}

export function useOperationServices({ operationId, quoteId, opportunityId, enabled = true }: Args) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const importedRef = useRef<string | null>(null);

  const key = ["operation-services", operationId];

  const { data: services = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!operationId && enabled,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_services" as any)
        .select("*")
        .eq("operation_id", operationId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as OperationService[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: key });

  /** Idempotent import of the linked quote's services into this operation. */
  const importFromQuote = useMutation({
    mutationFn: async () => {
      if (!operationId || !user?.id) return 0;
      let resolvedQuoteId = quoteId || null;
      if (!resolvedQuoteId && opportunityId) {
        const { data: q } = await supabase
          .from("quotes")
          .select("id")
          .eq("opportunity_id", opportunityId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        resolvedQuoteId = (q as any)?.id ?? null;
      }
      if (!resolvedQuoteId) return 0;

      const { data: qs, error } = await supabase
        .from("quote_services")
        .select("id, service_type, service_data, amount, description, order_index")
        .eq("quote_id", resolvedQuoteId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      if (!qs?.length) return 0;

      const { data: existing } = await supabase
        .from("operation_services" as any)
        .select("source_quote_service_id")
        .eq("operation_id", operationId);
      const already = new Set(
        ((existing || []) as any[]).map((r) => r.source_quote_service_id).filter(Boolean),
      );

      const rows = qs
        .filter((s: any) => !already.has(s.id))
        .map((s: any, idx: number) => {
          const mapped = mapServiceDataToOperationService(
            s.service_type,
            (s.service_data || {}) as any,
            Number(s.amount) || 0,
          );
          return {
            operation_id: operationId,
            user_id: user.id,
            source_quote_service_id: s.id,
            service_type: mapped.service_type,
            name: mapped.name,
            supplier: mapped.supplier,
            destination: mapped.destination,
            start_date: mapped.start_date,
            end_date: mapped.end_date,
            amount: Number(s.amount) || mapped.amount || 0,
            notes: null,
            service_data: (s.service_data || {}) as any,
            position: s.order_index ?? idx,
          };
        });
      if (rows.length === 0) return 0;
      const { error: insErr } = await supabase.from("operation_services" as any).insert(rows as any);
      if (insErr) throw insErr;
      return rows.length;
    },
    onSuccess: (count) => {
      if (count) invalidate();
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível importar os serviços do orçamento"),
  });

  // Auto-import once per operation when there are no operational services yet
  const autoImport = importFromQuote.mutateAsync;
  useEffect(() => {
    if (!enabled || !operationId || isLoading) return;
    if (services.length > 0) return;
    if (importedRef.current === operationId) return;
    importedRef.current = operationId;
    autoImport().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, operationId, isLoading, services.length]);

  const addService = useMutation({
    mutationFn: async (input: Partial<OperationService>) => {
      if (!operationId || !user?.id) throw new Error("Sem operação");
      const { error } = await supabase.from("operation_services" as any).insert({
        operation_id: operationId,
        user_id: user.id,
        service_type: input.service_type || "other",
        name: input.name || "Serviço",
        supplier: input.supplier ?? null,
        destination: input.destination ?? null,
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        amount: input.amount ?? 0,
        notes: input.notes ?? null,
        service_data: input.service_data ?? {},
        position: services.length,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Serviço adicionado");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao adicionar serviço"),
  });

  const updateService = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<OperationService>) => {
      const allowed: (keyof OperationService)[] = [
        "service_type", "name", "supplier", "destination", "start_date", "end_date",
        "amount", "notes", "service_data", "is_confirmed", "is_paid", "is_issued",
        "is_delivered", "position",
      ];
      const payload: Record<string, any> = {};
      allowed.forEach((k) => {
        if (k in patch) payload[k as string] = (patch as any)[k];
      });
      const { error } = await supabase
        .from("operation_services" as any)
        .update(payload as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
    onError: (e: any) => toast.error(e?.message || "Erro ao salvar serviço"),
  });

  const removeService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operation_services" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Serviço removido da operação");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao remover serviço"),
  });

  const toggleFlag = useCallback(
    (id: string, flag: OperationServiceFlag, value: boolean) =>
      updateService.mutateAsync({ id, [flag]: value } as any),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return {
    services,
    isLoading,
    isImporting: importFromQuote.isPending,
    importFromQuote: importFromQuote.mutateAsync,
    addService: addService.mutateAsync,
    updateService: updateService.mutateAsync,
    removeService: removeService.mutateAsync,
    toggleFlag,
  };
}
