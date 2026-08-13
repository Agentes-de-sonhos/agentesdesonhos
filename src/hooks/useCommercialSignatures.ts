import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import type { CommercialSignature } from "@/types/signature";
import {
  buildSystemSignature,
  getEffectiveCommercialSignature,
  isSystemSignatureId,
  type AgencySignatureBase,
} from "@/lib/effectiveSignature";
import { toast } from "sonner";

const TABLE = "commercial_signatures" as const;

export function useCommercialSignatures() {
  const { user } = useAuth();
  const qc = useQueryClient();
  // Signatures belong to the AGENCY (holder/master), never to the logged-in member.
  const { agencyOwnerId } = useAgencyOwnerId();

  const query = useQuery({
    queryKey: ["commercial_signatures", agencyOwnerId],
    enabled: !!agencyOwnerId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("user_id", agencyOwnerId!)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CommercialSignature[];
    },
    staleTime: 60_000,
  });

  // Automatic base signature: data of the agency holder (owner/master/subscriber).
  // Resolved dynamically through a secure RPC so it never goes stale nor duplicates.
  const baseQuery = useQuery({
    queryKey: ["commercial_signature_base", agencyOwnerId],
    enabled: !!agencyOwnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_agency_signature_base" as any, {
        _agency_id: agencyOwnerId!,
      });
      if (error) return null;
      const row = (Array.isArray(data) ? data[0] : data) as AgencySignatureBase | undefined;
      return row ?? null;
    },
  });

  const signatures = query.data || [];
  const systemSignature = buildSystemSignature(agencyOwnerId, baseQuery.data);
  const activeSignatures = signatures.filter((s) => s.is_active);
  const customDefault = signatures.find((s) => s.is_default && s.is_active) || null;
  const effectiveSignature = getEffectiveCommercialSignature({ signatures, systemSignature });
  const isSystemEffective = !!effectiveSignature && isSystemSignatureId(effectiveSignature.id);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["commercial_signatures", agencyOwnerId] });
    qc.invalidateQueries({ queryKey: ["commercial_signature_base", agencyOwnerId] });
  };

  const create = useMutation({
    mutationFn: async (payload: Partial<CommercialSignature>) => {
      if (!agencyOwnerId) throw new Error("Sem agência");
      const insert = { ...payload, user_id: agencyOwnerId };
      delete (insert as any).id;
      const { data, error } = await supabase.from(TABLE as any).insert(insert as any).select().single();
      if (error) throw error;
      return data as unknown as CommercialSignature;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura criada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao criar assinatura"),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<CommercialSignature> }) => {
      if (isSystemSignatureId(id)) throw new Error("A assinatura do cadastro é atualizada no seu perfil");
      const { data, error } = await supabase.from(TABLE as any).update(patch as any).eq("id", id).select().single();
      if (error) throw error;
      return data as unknown as CommercialSignature;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura atualizada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao atualizar"),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (isSystemSignatureId(id)) throw new Error("A assinatura do cadastro não pode ser excluída");
      const { error } = await supabase.from(TABLE as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura removida");
    },
    onError: (e: any) => toast.error(e?.message || "Não foi possível remover. Tente inativar."),
  });

  const setDefault = useMutation({
    mutationFn: async (id: string) => {
      if (!agencyOwnerId) throw new Error("Sem agência");
      if (isSystemSignatureId(id)) {
        // Back to the registration signature: clear any explicit custom default.
        const { error } = await supabase
          .from(TABLE as any)
          .update({ is_default: false } as any)
          .eq("user_id", agencyOwnerId)
          .eq("is_default", true);
        if (error) throw error;
        return;
      }
      // Clear first to respect the single-default unique index, then set.
      const { error: clearErr } = await supabase
        .from(TABLE as any)
        .update({ is_default: false } as any)
        .eq("user_id", agencyOwnerId)
        .eq("is_default", true)
        .neq("id", id);
      if (clearErr) throw clearErr;
      const { error } = await supabase.from(TABLE as any).update({ is_default: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura padrão definida");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao definir padrão"),
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const src = isSystemSignatureId(id) ? systemSignature : signatures.find((s) => s.id === id);
      if (!src || !agencyOwnerId) throw new Error("Assinatura não encontrada");
      const { id: _omit, created_at, updated_at, is_default, ...rest } = src as any;
      const insert = { ...rest, name: `${src.name} (cópia)`, is_default: false, user_id: agencyOwnerId };
      const { error } = await supabase.from(TABLE as any).insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura duplicada");
    },
    onError: (e: any) => toast.error(e?.message || "Erro ao duplicar"),
  });

  return {
    agencyOwnerId,
    isOwner: !!user?.id && user.id === agencyOwnerId,
    signatures,
    activeSignatures,
    systemSignature,
    /** All selectable signatures, automatic one first */
    allSignatures: systemSignature ? [systemSignature, ...activeSignatures] : activeSignatures,
    customDefault,
    effectiveSignature,
    /** Legacy alias kept for consumers: now the effective (resolver) signature */
    defaultSignature: effectiveSignature,
    isSystemEffective,
    isLoading: query.isLoading || baseQuery.isLoading,
    create,
    update,
    remove,
    setDefault,
    duplicate,
    refetch: query.refetch,
  };
}
