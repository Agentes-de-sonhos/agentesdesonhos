import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type {
  Operation,
  OperationStage,
  OperationTask,
  OperationTimelineEvent,
  OperationAttachment,
} from "@/types/operations";
import { STAGE_CHECKLISTS } from "@/types/operations";

export function useOperations() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: operations = [], isLoading } = useQuery({
    queryKey: ["operations", user?.id],
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operations" as any)
        .select("*, client:clients(id,name,phone,email)")
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as Operation[];
    },
  });

  const createOperation = useMutation({
    mutationFn: async (input: Partial<Operation>) => {
      if (!user?.id) throw new Error("Não autenticado");
      const payload: any = {
        user_id: user.id,
        client_id: input.client_id,
        title: input.title || "Nova operação",
        destination: input.destination ?? null,
        travel_start_date: input.travel_start_date ?? null,
        travel_end_date: input.travel_end_date ?? null,
        passengers_count: input.passengers_count ?? 1,
        sale_amount: input.sale_amount ?? 0,
        stage: input.stage ?? "venda_confirmada",
        priority: input.priority ?? "normal",
        payment_status: input.payment_status ?? "pendente",
        opportunity_id: input.opportunity_id ?? null,
        quote_id: input.quote_id ?? null,
        itinerary_id: input.itinerary_id ?? null,
        trip_id: input.trip_id ?? null,
        notes: input.notes ?? null,
      };
      const { data, error } = await supabase
        .from("operations" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as unknown as Operation;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations", user?.id] });
      toast.success("Operação criada");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar operação"),
  });

  const updateOperation = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Operation>) => {
      const { error } = await supabase
        .from("operations" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations", user?.id] });
      qc.invalidateQueries({ queryKey: ["operation-tasks"] });
      qc.invalidateQueries({ queryKey: ["operation-timeline"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const moveStage = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: OperationStage }) => {
      const { error } = await supabase
        .from("operations" as any)
        .update({ stage } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations", user?.id] });
      qc.invalidateQueries({ queryKey: ["operation-timeline"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao mover"),
  });

  const deleteOperation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operations", user?.id] });
      toast.success("Operação removida");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao remover"),
  });

  return {
    operations,
    isLoading,
    createOperation: createOperation.mutateAsync,
    updateOperation: updateOperation.mutateAsync,
    moveStage: moveStage.mutateAsync,
    deleteOperation: deleteOperation.mutateAsync,
  };
}

export function useOperationTasks(operationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["operation-tasks", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_tasks" as any)
        .select("*")
        .eq("operation_id", operationId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as OperationTask[];
    },
  });

  const seedChecklist = useMutation({
    mutationFn: async (stage: import("@/types/operations").OperationStage) => {
      if (!user?.id || !operationId) return;
      const existing = tasks.filter((t) => t.stage === stage);
      if (existing.length > 0) return;
      // Try loading a user-defined template first
      let labels: string[] = [];
      const { data: tpl } = await supabase
        .from("operation_checklist_templates" as any)
        .select("items")
        .eq("user_id", user.id)
        .eq("stage", stage)
        .eq("is_default", true)
        .maybeSingle();
      const tplItems = (tpl as any)?.items;
      if (Array.isArray(tplItems) && tplItems.length > 0) {
        labels = tplItems
          .map((it: any) => (typeof it === "string" ? it : it?.label))
          .filter((s: any) => typeof s === "string" && s.trim().length > 0);
      }
      if (labels.length === 0) labels = STAGE_CHECKLISTS[stage] || [];
      if (labels.length === 0) return;
      const rows = labels.map((label, idx) => ({
        operation_id: operationId,
        user_id: user.id,
        stage,
        label,
        position: idx,
      }));
      const { error } = await supabase.from("operation_tasks" as any).insert(rows);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-tasks", operationId] }),
  });

  const toggleTask = useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from("operation_tasks" as any)
        .update({
          is_done,
          done_at: is_done ? new Date().toISOString() : null,
          done_by: is_done ? user?.id : null,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-tasks", operationId] }),
  });

  const addTask = useMutation({
    mutationFn: async ({ stage, label }: { stage: import("@/types/operations").OperationStage; label: string }) => {
      if (!user?.id || !operationId) return;
      const { error } = await supabase.from("operation_tasks" as any).insert({
        operation_id: operationId,
        user_id: user.id,
        stage,
        label,
        position: tasks.length,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-tasks", operationId] }),
  });

  const removeTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("operation_tasks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-tasks", operationId] }),
  });

  return {
    tasks,
    isLoading,
    seedChecklist: seedChecklist.mutateAsync,
    toggleTask: toggleTask.mutateAsync,
    addTask: addTask.mutateAsync,
    removeTask: removeTask.mutateAsync,
  };
}

export function useChecklistTemplates() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const saveTemplate = useMutation({
    mutationFn: async ({
      stage,
      labels,
    }: {
      stage: import("@/types/operations").OperationStage;
      labels: string[];
    }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const items = labels.map((label, idx) => ({ label, position: idx }));
      // Upsert by (user_id, stage) where is_default=true
      const { data: existing } = await supabase
        .from("operation_checklist_templates" as any)
        .select("id")
        .eq("user_id", user.id)
        .eq("stage", stage)
        .eq("is_default", true)
        .maybeSingle();
      if ((existing as any)?.id) {
        const { error } = await supabase
          .from("operation_checklist_templates" as any)
          .update({ items, name: "Padrão" } as any)
          .eq("id", (existing as any).id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("operation_checklist_templates" as any)
          .insert({
            user_id: user.id,
            stage,
            name: "Padrão",
            is_default: true,
            items,
          } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-checklist-templates"] }),
  });

  const resetTemplate = useMutation({
    mutationFn: async (stage: import("@/types/operations").OperationStage) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await supabase
        .from("operation_checklist_templates" as any)
        .delete()
        .eq("user_id", user.id)
        .eq("stage", stage)
        .eq("is_default", true);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-checklist-templates"] }),
  });

  return {
    saveTemplate: saveTemplate.mutateAsync,
    resetTemplate: resetTemplate.mutateAsync,
    isSaving: saveTemplate.isPending,
  };
}

export function useOperationTimeline(operationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["operation-timeline", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_timeline" as any)
        .select("*")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OperationTimelineEvent[];
    },
  });

  const addNote = useMutation({
    mutationFn: async (description: string) => {
      if (!user?.id || !operationId) return;
      const { error } = await supabase.from("operation_timeline" as any).insert({
        operation_id: operationId,
        user_id: user.id,
        event_type: "manual_note",
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["operation-timeline", operationId] }),
  });

  return { events, isLoading, addNote: addNote.mutateAsync };
}

export function useOperationAttachments(operationId: string | null) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: attachments = [], isLoading } = useQuery({
    queryKey: ["operation-attachments", operationId],
    enabled: !!operationId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operation_attachments" as any)
        .select("*")
        .eq("operation_id", operationId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as unknown as OperationAttachment[];
    },
  });

  const uploadFile = useMutation({
    mutationFn: async ({ file, category }: { file: File; category: string }) => {
      if (!user?.id || !operationId) throw new Error("Sem operação");
      const path = `${user.id}/${operationId}/${Date.now()}-${file.name}`;
      const up = await supabase.storage.from("operation-files").upload(path, file);
      if (up.error) throw up.error;
      const { data: signed } = await supabase.storage
        .from("operation-files")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const { error } = await supabase.from("operation_attachments" as any).insert({
        operation_id: operationId,
        user_id: user.id,
        file_url: signed?.signedUrl || path,
        file_name: file.name,
        file_type: file.type,
        file_size: file.size,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["operation-attachments", operationId] });
      toast.success("Arquivo anexado");
    },
    onError: (e: any) => toast.error(e.message || "Falha no upload"),
  });

  const removeAttachment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("operation_attachments" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["operation-attachments", operationId] }),
  });

  return {
    attachments,
    isLoading,
    uploadFile: uploadFile.mutateAsync,
    removeAttachment: removeAttachment.mutateAsync,
  };
}