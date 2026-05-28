import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface OperationLabel {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
  updated_at: string;
}

export interface OperationLabelAssignment {
  id: string;
  operation_id: string;
  label_id: string;
  user_id: string;
  created_at: string;
}

export function useOperationLabels() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ["operation-labels", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_labels" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as OperationLabel[];
    },
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("operation_labels" as any)
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
      if (error) throw error;
      return data as unknown as OperationLabel;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operation-labels"] });
      toast.success("Etiqueta criada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar etiqueta"),
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from("operation_labels" as any)
        .update({ name, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operation-labels"] });
      qc.invalidateQueries({ queryKey: ["operation-label-assignments"] });
    },
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operation_labels" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operation-labels"] });
      qc.invalidateQueries({ queryKey: ["operation-label-assignments"] });
    },
  });

  return {
    labels,
    isLoading,
    createLabel: createLabel.mutateAsync,
    updateLabel: updateLabel.mutateAsync,
    deleteLabel: deleteLabel.mutateAsync,
  };
}

export function useOperationLabelAssignments() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ["operation-label-assignments", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_label_assignments" as any)
        .select("*, label:operation_labels(*)")
        .eq("user_id", user!.id);
      if (error) throw error;
      return (data || []) as unknown as (OperationLabelAssignment & { label: OperationLabel })[];
    },
  });

  const assignLabel = useMutation({
    mutationFn: async ({ operationId, labelId }: { operationId: string; labelId: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("operation_label_assignments" as any).insert({
        operation_id: operationId,
        label_id: labelId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-label-assignments"] }),
    onError: (e: any) => toast.error(e.message || "Erro ao aplicar etiqueta"),
  });

  const unassignLabel = useMutation({
    mutationFn: async ({ operationId, labelId }: { operationId: string; labelId: string }) => {
      const { error } = await supabase
        .from("operation_label_assignments" as any)
        .delete()
        .eq("operation_id", operationId)
        .eq("label_id", labelId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-label-assignments"] }),
  });

  const byOperation: Record<string, OperationLabel[]> = {};
  assignments.forEach((a) => {
    if (!a.label) return;
    if (!byOperation[a.operation_id]) byOperation[a.operation_id] = [];
    byOperation[a.operation_id].push(a.label);
  });

  return {
    assignments,
    byOperation,
    assignLabel: assignLabel.mutateAsync,
    unassignLabel: unassignLabel.mutateAsync,
  };
}