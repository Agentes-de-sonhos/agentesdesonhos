import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { useToast } from "@/hooks/use-toast";
import {
  buildServiceCatalog, findDuplicateService, normalizeServiceName,
  type CustomServiceRow, type ServiceOption, type SupplierServiceRule, type CommissionKind,
} from "@/lib/supplierCommissionRules";
import type { ProductType } from "@/types/financial";

const db = supabase as any;

/** Catálogo de serviços da agência: categorias do sistema + serviços personalizados (somente da própria agência). */
export function useServiceCatalog() {
  const { agencyOwnerId } = useAgencyOwnerId();
  const q = useQuery({
    queryKey: ["agency_service_types", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await db.from("agency_service_types")
        .select("id,name,base_category,is_active").eq("agency_id", agencyOwnerId).order("name");
      if (error) throw error;
      return (data || []) as CustomServiceRow[];
    },
  });
  const catalog = useMemo(() => buildServiceCatalog(q.data || []), [q.data]);
  return { catalog, isLoading: q.isLoading };
}

export function useCreateServiceType() {
  const { agencyOwnerId } = useAgencyOwnerId();
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: async ({ name, baseCategory, catalog }: { name: string; baseCategory: ProductType; catalog: ServiceOption[] }): Promise<ServiceOption> => {
      const clean = name.trim().replace(/\s+/g, " ");
      if (clean.length < 2) throw new Error("Informe um nome com ao menos 2 letras.");
      const dup = findDuplicateService(clean, catalog);
      if (dup) return dup; // reaproveita o existente em vez de duplicar
      const { data, error } = await db.from("agency_service_types").insert({
        agency_id: agencyOwnerId, name: clean, normalized_name: normalizeServiceName(clean), base_category: baseCategory,
      }).select("id,name,base_category").single();
      if (error) {
        if (error.code === "23505") throw new Error("Já existe um serviço com esse nome na sua agência.");
        throw error;
      }
      return { key: `custom:${data.id}`, label: data.name, baseCategory: data.base_category, custom: true };
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["agency_service_types"] }),
    onError: (e: any) => toast({ title: "Não foi possível criar o serviço", description: e.message, variant: "destructive" }),
  });
}

/** Todas as regras fornecedor+serviço da agência. */
export function useSupplierServiceRules() {
  const { agencyOwnerId } = useAgencyOwnerId();
  return useQuery({
    queryKey: ["agency_supplier_service_commissions", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await db.from("agency_supplier_service_commissions")
        .select("id,operator_id,service_key,commission_type,commission_value").eq("agency_id", agencyOwnerId);
      if (error) throw error;
      return (data || []) as (SupplierServiceRule & { id: string })[];
    },
  });
}

export interface RuleDraft { service_key: string; commission_type: CommissionKind; commission_value: number | null }

/** Substitui o conjunto de regras de um fornecedor (remove as retiradas, grava as demais). */
export async function saveSupplierServiceRules(agencyId: string, operatorId: string, rules: RuleDraft[]) {
  const keys = rules.map((r) => r.service_key);
  if (new Set(keys).size !== keys.length) throw new Error("Há serviços repetidos na tabela de comissões.");
  let del = db.from("agency_supplier_service_commissions").delete().eq("agency_id", agencyId).eq("operator_id", operatorId);
  if (keys.length) del = del.not("service_key", "in", `(${keys.map((k) => `"${k}"`).join(",")})`);
  const { error: delErr } = await del;
  if (delErr) throw delErr;
  if (!rules.length) return;
  const { error } = await db.from("agency_supplier_service_commissions").upsert(
    rules.map((r) => ({
      agency_id: agencyId, operator_id: operatorId, service_key: r.service_key, commission_type: r.commission_type,
      commission_value: r.commission_type === "none" ? null : r.commission_value,
    })),
    { onConflict: "agency_id,operator_id,service_key" },
  );
  if (error) throw error;
}
