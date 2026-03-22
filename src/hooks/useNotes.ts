import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Note, NoteFilters, NoteSortOption } from "@/types/notes";

export function useNotes() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<NoteFilters>({
    search: "",
    sortBy: "updated_at",
    sortOrder: "desc",
  });

  // Fetch all notes
  const {
    data: notes = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ["notes", user?.id, filters],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from("notes")
        .select("id, user_id, title, content, is_favorite, client_id, event_id, opportunity_id, created_at, updated_at")
        .eq("user_id", user.id);

      // Apply search filter
      if (filters.search) {
        query = query.ilike("title", `%${filters.search}%`);
      }

      // Apply sorting
      query = query.order(filters.sortBy, { ascending: filters.sortOrder === "asc" });

      const { data, error } = await query;
      if (error) throw error;
      return data as Note[];
    },
    enabled: !!user?.id,
  });

  // Create note
  const createNoteMutation = useMutation({
    mutationFn: async (noteData: Partial<Note>) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: noteData.title || "Nova Nota",
          content: noteData.content || "",
          is_favorite: noteData.is_favorite || false,
          client_id: noteData.client_id || null,
          opportunity_id: noteData.opportunity_id || null,
          event_id: noteData.event_id || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao criar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update note
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Note> & { id: string }) => {
      const { data, error } = await supabase
        .from("notes")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: (error) => {
      toast({
        title: "Erro ao atualizar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete note
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const { error } = await supabase.from("notes").delete().eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({
        title: "Nota excluída",
        description: "A nota foi removida com sucesso.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao excluir nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Duplicate note
  const duplicateNoteMutation = useMutation({
    mutationFn: async (note: Note) => {
      if (!user?.id) throw new Error("Usuário não autenticado");

      const { data, error } = await supabase
        .from("notes")
        .insert({
          user_id: user.id,
          title: `${note.title} (cópia)`,
          content: note.content,
          is_favorite: false,
          client_id: note.client_id,
          opportunity_id: note.opportunity_id,
          event_id: note.event_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data as Note;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast({
        title: "Nota duplicada",
        description: "Uma cópia da nota foi criada.",
      });
    },
    onError: (error) => {
      toast({
        title: "Erro ao duplicar nota",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    notes,
    isLoading,
    error,
    filters,
    setFilters,
    createNote: createNoteMutation.mutateAsync,
    updateNote: updateNoteMutation.mutateAsync,
    deleteNote: deleteNoteMutation.mutateAsync,
    duplicateNote: duplicateNoteMutation.mutateAsync,
    isCreating: createNoteMutation.isPending,
    isUpdating: updateNoteMutation.isPending,
    isDeleting: deleteNoteMutation.isPending,
  };
}

// Hook for auto-save functionality
export function useAutoSave(
  noteId: string | null,
  title: string,
  content: string,
  updateNote: (data: { id: string; title?: string; content?: string }) => Promise<Note>,
  delay: number = 1500
) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const previousValuesRef = useRef({ title, content });

  const save = useCallback(async () => {
    if (!noteId) return;
    
    const hasChanges = 
      previousValuesRef.current.title !== title || 
      previousValuesRef.current.content !== content;
    
    if (!hasChanges) return;

    setIsSaving(true);
    try {
      await updateNote({ id: noteId, title, content });
      setLastSaved(new Date());
      previousValuesRef.current = { title, content };
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [noteId, title, content, updateNote]);

  useEffect(() => {
    if (!noteId) return;

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      save();
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [noteId, title, content, delay, save]);

  // Sync previous values when note changes
  useEffect(() => {
    previousValuesRef.current = { title, content };
  }, [noteId]);

  return { isSaving, lastSaved, saveNow: save };
}
