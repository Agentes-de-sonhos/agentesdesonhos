import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { CommercialSignature } from "@/types/signature";
import { toast } from "sonner";

const TABLE = "commercial_signatures" as const;

export function useCommercialSignatures() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ["commercial_signatures", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("display_order", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as CommercialSignature[];
    },
    staleTime: 60_000,
  });

  const signatures = query.data || [];
  const activeSignatures = signatures.filter((s) => s.is_active);
  const defaultSignature = signatures.find((s) => s.is_default && s.is_active) || null;

  const invalidate = () => qc.invalidateQueries({ queryKey: ["commercial_signatures", user?.id] });

  const create = useMutation({
    mutationFn: async (payload: Partial<CommercialSignature>) => {
      if (!user?.id) throw new Error("Sem usuário");
      const insert = { ...payload, user_id: user.id };
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
      const { error } = await supabase.from(TABLE as any).update({ is_default: true } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura padrão definida");
    },
  });

  const duplicate = useMutation({
    mutationFn: async (id: string) => {
      const src = signatures.find((s) => s.id === id);
      if (!src || !user?.id) throw new Error("Assinatura não encontrada");
      const { id: _omit, created_at, updated_at, is_default, ...rest } = src as any;
      const insert = { ...rest, name: `${src.name} (cópia)`, is_default: false, user_id: user.id };
      const { error } = await supabase.from(TABLE as any).insert(insert);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Assinatura duplicada");
    },
  });

  return {
    signatures,
    activeSignatures,
    defaultSignature,
    isLoading: query.isLoading,
    create,
    update,
    remove,
    setDefault,
    duplicate,
    refetch: query.refetch,
  };
}