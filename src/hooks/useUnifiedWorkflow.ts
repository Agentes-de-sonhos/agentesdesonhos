import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const sb = supabase as any;

/** Resultado de sucesso da RPC confirm_travel_file_sale. */
export interface ConfirmSaleResult {
  file_id: string;
  opportunity_id: string | null;
  operation_id: string | null;
  sale_id: string | null;
  created: string[];
  reused: string[];
  replayed: boolean;
  warnings: string[];
  total: number;
  currency: string;
}

/**
 * Falha estruturada: a RPC devolve JSON (em vez de exceção) quando precisa
 * PERSISTIR a ocorrência antes de desistir — ex.: LEGACY_AMBIGUOUS_LINK.
 */
export interface ConfirmSaleFailure {
  error: string;
  message?: string | null;
  entity?: string | null;
  file_id?: string | null;
  opportunity_id?: string | null;
}

export type ConfirmSaleResponse = ConfirmSaleResult | ConfirmSaleFailure;

export function isConfirmSaleFailure(
  data: ConfirmSaleResponse | null | undefined,
): data is ConfirmSaleFailure {
  return !!data && typeof (data as ConfirmSaleFailure).error === "string";
}

/** Erro de domínio lançado pelo hook quando a RPC devolve falha estruturada. */
export class ConfirmSaleDomainError extends Error {
  code: string;
  constructor(failure: ConfirmSaleFailure) {
    super(
      failure.message ||
        "Não foi possível confirmar a venda. Revise os vínculos deste processo.",
    );
    this.name = "ConfirmSaleDomainError";
    this.code = failure.error;
  }
}


/**
 * Feature flag do fluxo unificado (Fase 1A): entitlement de agência
 * `unified_workflow_v2`, desligado por padrão. Kill switch = desativar o
 * entitlement no painel administrativo — RPC e interface voltam ao legado.
 */
export function useUnifiedWorkflowV2() {
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ["unified-workflow-v2", user?.id],
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb.rpc("current_agency_has_entitlement", {
        _key: "unified_workflow_v2",
      });
      if (error) throw error;
      return !!data;
    },
  });
  return { enabled: query.data === true, isLoading: query.isLoading };
}

/**
 * Confirmação transacional e idempotente da venda. A chave de idempotência
 * deve ser gerada UMA vez por tentativa real (ex.: ao abrir o diálogo) e
 * reutilizada em repetições — duplo clique e nova tentativa após falha de
 * rede nunca duplicam operação, venda ou serviços.
 */
export function useConfirmTravelFileSale(fileId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      idempotencyKey: string;
      acceptance: {
        channel: string;
        note?: string | null;
        supplier_exceptions?: Record<string, string>;
      };
      expectedUpdatedAt?: string | null;
    }): Promise<ConfirmSaleResult> => {
      const { data, error } = await sb.rpc("confirm_travel_file_sale", {
        p_file_id: fileId,
        p_idempotency_key: input.idempotencyKey,
        p_acceptance: {
          channel: input.acceptance.channel,
          note: input.acceptance.note ?? null,
          supplier_exceptions: input.acceptance.supplier_exceptions ?? {},
        },
        p_expected_updated_at: input.expectedUpdatedAt ?? null,
      });
      if (error) throw error;
      return data as ConfirmSaleResult;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-file"] });
      queryClient.invalidateQueries({ queryKey: ["travel-files-page"] });
      queryClient.invalidateQueries({ queryKey: ["travel-files-summary"] });
      queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["operations"] });
      queryClient.invalidateQueries({ queryKey: ["sales"] });
    },
  });
}

/** Termos padrão da agência para um operador (comissão, prazo, fatura). */
export function useSupplierTerms(operatorId?: string | null, enabled = true) {
  return useQuery({
    queryKey: ["travel-file-supplier-terms", operatorId],
    enabled: !!operatorId && enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await sb.rpc("travel_file_supplier_terms", {
        _operator_id: operatorId,
      });
      if (error) throw error;
      return (data || null) as {
        commission_type: string | null;
        commission_percent: number | null;
        commission_fixed: number | null;
        non_commissionable_fees: number | null;
        payment_rule: string | null;
        payment_days: number | null;
        requires_invoice: boolean | null;
      } | null;
    },
  });
}

/** Grava a regra financeira confirmada (snapshot) de um serviço do file. */
export function useServiceFinancialRule(fileId?: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      serviceId: string;
      payload: Record<string, unknown>;
    }) => {
      const { error } = await sb.rpc("travel_file_service_set_financial_rule", {
        _service_id: input.serviceId,
        _payload: input.payload,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["travel-file"] });
    },
  });
}
