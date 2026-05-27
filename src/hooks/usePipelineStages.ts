import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type { PipelineStage, StageColor } from "@/types/crm";

export function usePipelineStages() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: stages = [], isLoading } = useQuery({
    queryKey: ["pipeline-stages", user?.id],
    queryFn: async () => {
      if (!user) return [];
      // Ensure defaults exist (idempotent)
      const { data: existing } = await supabase
        .from("pipeline_stages")
        .select("id")
        .eq("user_id", user.id)
        .limit(1);
      if (!existing || existing.length === 0) {
        await supabase.rpc("seed_default_pipeline_stages", { _user_id: user.id });
      }
      const { data, error } = await supabase
        .from("pipeline_stages")
        .select("*")
        .eq("user_id", user.id)
        .order("position", { ascending: true });
      if (error) throw error;
      return (data || []) as PipelineStage[];
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pipeline-stages"] });

  const createStage = useMutation({
    mutationFn: async (input: { name: string; color?: StageColor }) => {
      if (!user) throw new Error("Not authenticated");
      const maxPos = stages.reduce((m, s) => Math.max(m, s.position), -1);
      const { data, error } = await supabase
        .from("pipeline_stages")
        .insert({
          user_id: user.id,
          name: input.name.trim(),
          position: maxPos + 1,
          color: input.color || "slate",
          is_default: false,
        })
        .select()
        .single();
      if (error) throw error;
      return data as PipelineStage;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coluna criada");
    },
    onError: (e: any) => toast.error("Erro ao criar coluna", { description: e.message }),
  });

  const updateStage = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; name?: string; color?: StageColor }) => {
      const { error } = await supabase
        .from("pipeline_stages")
        .update(patch)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coluna atualizada");
    },
    onError: (e: any) => toast.error("Erro ao atualizar coluna", { description: e.message }),
  });

  const duplicateStage = useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      const source = stages.find((s) => s.id === id);
      if (!source) throw new Error("Coluna não encontrada");
      const newPos = source.position + 1;
      // Shift downstream stages
      const toShift = stages.filter((s) => s.position >= newPos);
      for (const s of toShift) {
        await supabase
          .from("pipeline_stages")
          .update({ position: s.position + 1 })
          .eq("id", s.id);
      }
      const { error } = await supabase.from("pipeline_stages").insert({
        user_id: user.id,
        name: `${source.name} (cópia)`,
        position: newPos,
        color: source.color,
        is_default: false,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Coluna duplicada");
    },
    onError: (e: any) => toast.error("Erro ao duplicar", { description: e.message }),
  });

  const deleteStage = useMutation({
    mutationFn: async ({ id, moveToStageId }: { id: string; moveToStageId?: string }) => {
      if (moveToStageId) {
        const { error: moveErr } = await supabase
          .from("opportunities")
          .update({ stage_id: moveToStageId })
          .eq("stage_id", id);
        if (moveErr) throw moveErr;
      }
      const { error } = await supabase.from("pipeline_stages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      toast.success("Coluna excluída");
    },
    onError: (e: any) => toast.error("Erro ao excluir", { description: e.message }),
  });

  const reorderStages = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      // Apply new positions sequentially
      for (let i = 0; i < orderedIds.length; i++) {
        const { error } = await supabase
          .from("pipeline_stages")
          .update({ position: i })
          .eq("id", orderedIds[i]);
        if (error) throw error;
      }
    },
    onMutate: async (orderedIds) => {
      await qc.cancelQueries({ queryKey: ["pipeline-stages", user?.id] });
      const previous = qc.getQueryData<PipelineStage[]>(["pipeline-stages", user?.id]);
      if (previous) {
        const map = new Map(previous.map((s) => [s.id, s]));
        const next = orderedIds
          .map((id, i) => map.get(id) && { ...map.get(id)!, position: i })
          .filter(Boolean) as PipelineStage[];
        qc.setQueryData(["pipeline-stages", user?.id], next);
      }
      return { previous };
    },
    onError: (e: any, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(["pipeline-stages", user?.id], ctx.previous);
      toast.error("Erro ao reordenar", { description: e.message });
    },
    onSuccess: () => invalidate(),
  });

  return {
    stages,
    isLoading,
    createStage: createStage.mutateAsync,
    updateStage: updateStage.mutateAsync,
    duplicateStage: duplicateStage.mutateAsync,
    deleteStage: deleteStage.mutateAsync,
    reorderStages: reorderStages.mutateAsync,
  };
}