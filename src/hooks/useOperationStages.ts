import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { toast } from "sonner";
import type { StageColor } from "@/types/crm";

export interface OperationPipelineStage {
  id: string;
  user_id: string;
  key: string;
  name: string;
  color: StageColor;
  position: number;
  legacy_key: string | null;
  is_protected: boolean;
  created_at: string;
  updated_at: string;
}

export function useOperationStages() {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const qc = useQueryClient();

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["operation-pipeline-stages", agencyOwnerId, user?.id],
    enabled: !!user && !!agencyOwnerId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      if (!user || !agencyOwnerId) return [];
      const { data: existing } = await supabase
        .from("operation_pipeline_stages" as any)
        .select("id")
        .eq("user_id", agencyOwnerId)
        .limit(1);
      if (!existing || (existing as any[]).length === 0) {
        await supabase.rpc("ensure_default_operation_stages" as any, { _user_id: agencyOwnerId });
      }
      const { data, error } = await supabase
        .from("operation_pipeline_stages" as any)
        .select("*")
        .eq("user_id", agencyOwnerId)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as OperationPipelineStage[];
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["operation-pipeline-stages"] });

  const slugify = (s: string) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 40);

  const createStage = useMutation({
    mutationFn: async (input: { name: string; color?: StageColor }) => {
      if (!user) throw new Error("Não autenticado");
      const maxPos = stages.reduce((m, s) => Math.max(m, s.position), -1);
      const base = slugify(input.name) || "etapa";
      let key = base;
      let n = 2;
      while (stages.some((s) => s.key === key)) {
        key = `${base}_${n++}`;
      }
      // Insert at position before the last protected stage if present
      const lastProtectedIdx = [...stages].reverse().findIndex((s) => s.is_protected);
      const insertPos =
        lastProtectedIdx >= 0 ? stages.length - 1 - lastProtectedIdx : maxPos + 1;
      // Shift any stages at/after insertPos
      const toShift = stages.filter((s) => s.position >= insertPos);
      for (const s of toShift) {
        await supabase
          .from("operation_pipeline_stages" as any)
          .update({ position: s.position + 1 } as any)
          .eq("id", s.id);
      }
      const { error } = await supabase.from("operation_pipeline_stages" as any).insert({
        user_id: agencyOwnerId || user.id,
        key,
        name: input.name.trim(),
        color: input.color || "slate",
        position: insertPos,
        is_protected: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coluna criada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar coluna"),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; color?: StageColor }) => {
      const { error } = await supabase
        .from("operation_pipeline_stages" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coluna atualizada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar coluna"),
  });

  const duplicateStage = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Não autenticado");
      const source = stages.find((s) => s.id === id);
      if (!source) throw new Error("Coluna não encontrada");
      const newPos = source.position + 1;
      const toShift = stages.filter((s) => s.position >= newPos);
      for (const s of toShift) {
        await supabase
          .from("operation_pipeline_stages" as any)
          .update({ position: s.position + 1 } as any)
          .eq("id", s.id);
      }
      const base = slugify(source.name + "_copia") || "etapa";
      let key = base;
      let n = 2;
      while (stages.some((s) => s.key === key)) {
        key = `${base}_${n++}`;
      }
      const { error } = await supabase.from("operation_pipeline_stages" as any).insert({
        user_id: agencyOwnerId || user.id,
        key,
        name: `${source.name} (cópia)`,
        color: source.color,
        position: newPos,
        is_protected: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coluna duplicada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao duplicar"),
  });

  const deleteStage = useMutation({
    mutationFn: async ({ id, moveToStageKey }: { id: string; moveToStageKey?: string }) => {
      const target = stages.find((s) => s.id === id);
      if (!target) throw new Error("Coluna não encontrada");
      if (target.is_protected) throw new Error("Esta coluna não pode ser excluída");
      if (moveToStageKey) {
        const { error: moveErr } = await supabase
          .from("operations" as any)
          .update({ stage: moveToStageKey } as any)
          .eq("stage", target.key);
        if (moveErr) throw moveErr;
      }
      const { error } = await supabase
        .from("operation_pipeline_stages" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["operations"] });
      toast.success("Coluna excluída");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir"),
  });

  return {
    stages,
    isLoading,
    createStage: createStage.mutateAsync,
    updateStage: updateStage.mutateAsync,
    duplicateStage: duplicateStage.mutateAsync,
    deleteStage: deleteStage.mutateAsync,
  };
}