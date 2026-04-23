import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type {
  OpportunityNote,
  OpportunityLabel,
  OpportunityLabelAssignment,
} from "@/types/opportunity-extras";

// ============== NOTES (Timeline) ==============
export function useOpportunityNotes(opportunityId: string | null) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: notes = [], isLoading } = useQuery({
    queryKey: ["opportunity-notes", opportunityId],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from("opportunity_notes")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as OpportunityNote[];
    },
    enabled: !!opportunityId,
  });

  const createNote = useMutation({
    mutationFn: async (content: string) => {
      if (!user || !opportunityId) throw new Error("Não autenticado");
      const { error } = await supabase.from("opportunity_notes").insert({
        opportunity_id: opportunityId,
        user_id: user.id,
        content,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-notes", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-notes-counts"] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao salvar anotação", description: error.message, variant: "destructive" }),
  });

  const updateNote = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      const { error } = await supabase
        .from("opportunity_notes")
        .update({ content })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-notes", opportunityId] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao editar anotação", description: error.message, variant: "destructive" }),
  });

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunity_notes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-notes", opportunityId] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-notes-counts"] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao excluir anotação", description: error.message, variant: "destructive" }),
  });

  return {
    notes,
    isLoading,
    createNote: createNote.mutateAsync,
    updateNote: updateNote.mutateAsync,
    deleteNote: deleteNote.mutateAsync,
    isSaving: createNote.isPending || updateNote.isPending,
  };
}

// Counts of notes per opportunity (for badge on cards)
export function useOpportunityNotesCounts() {
  const { user } = useAuth();

  const { data: counts = {} } = useQuery({
    queryKey: ["opportunity-notes-counts", user?.id],
    queryFn: async () => {
      if (!user) return {} as Record<string, number>;
      const { data, error } = await supabase
        .from("opportunity_notes")
        .select("opportunity_id")
        .eq("user_id", user.id);
      if (error) throw error;
      const result: Record<string, number> = {};
      (data || []).forEach((n: { opportunity_id: string }) => {
        result[n.opportunity_id] = (result[n.opportunity_id] || 0) + 1;
      });
      return result;
    },
    enabled: !!user,
  });

  return counts;
}

// ============== LABELS ==============
export function useOpportunityLabels() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: labels = [], isLoading } = useQuery({
    queryKey: ["opportunity-labels", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("opportunity_labels")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });
      if (error) throw error;
      return data as OpportunityLabel[];
    },
    enabled: !!user,
  });

  const createLabel = useMutation({
    mutationFn: async ({ name, color }: { name: string; color: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("opportunity_labels")
        .insert({ user_id: user.id, name, color })
        .select()
        .single();
      if (error) throw error;
      return data as OpportunityLabel;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-labels"] });
      toast({ title: "Etiqueta criada" });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao criar etiqueta", description: error.message, variant: "destructive" }),
  });

  const updateLabel = useMutation({
    mutationFn: async ({ id, name, color }: { id: string; name: string; color: string }) => {
      const { error } = await supabase
        .from("opportunity_labels")
        .update({ name, color })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-labels"] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-label-assignments"] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao editar etiqueta", description: error.message, variant: "destructive" }),
  });

  const deleteLabel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunity_labels").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-labels"] });
      queryClient.invalidateQueries({ queryKey: ["opportunity-label-assignments"] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao excluir etiqueta", description: error.message, variant: "destructive" }),
  });

  return {
    labels,
    isLoading,
    createLabel: createLabel.mutateAsync,
    updateLabel: updateLabel.mutateAsync,
    deleteLabel: deleteLabel.mutateAsync,
  };
}

// All assignments for the user (joined with labels) — used to render labels on cards
export function useOpportunityLabelAssignments() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: assignments = [] } = useQuery({
    queryKey: ["opportunity-label-assignments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("opportunity_label_assignments")
        .select("*, label:opportunity_labels(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as (OpportunityLabelAssignment & { label: OpportunityLabel })[];
    },
    enabled: !!user,
  });

  const assignLabel = useMutation({
    mutationFn: async ({ opportunityId, labelId }: { opportunityId: string; labelId: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("opportunity_label_assignments").insert({
        opportunity_id: opportunityId,
        label_id: labelId,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-label-assignments"] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao aplicar etiqueta", description: error.message, variant: "destructive" }),
  });

  const unassignLabel = useMutation({
    mutationFn: async ({ opportunityId, labelId }: { opportunityId: string; labelId: string }) => {
      const { error } = await supabase
        .from("opportunity_label_assignments")
        .delete()
        .eq("opportunity_id", opportunityId)
        .eq("label_id", labelId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-label-assignments"] });
    },
    onError: (error: Error) =>
      toast({ title: "Erro ao remover etiqueta", description: error.message, variant: "destructive" }),
  });

  // Helper grouped by opportunity_id
  const byOpportunity: Record<string, OpportunityLabel[]> = {};
  assignments.forEach((a) => {
    if (!a.label) return;
    if (!byOpportunity[a.opportunity_id]) byOpportunity[a.opportunity_id] = [];
    byOpportunity[a.opportunity_id].push(a.label);
  });

  return {
    assignments,
    byOpportunity,
    assignLabel: assignLabel.mutateAsync,
    unassignLabel: unassignLabel.mutateAsync,
  };
}