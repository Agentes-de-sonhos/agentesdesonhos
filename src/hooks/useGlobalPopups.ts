import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface GlobalPopup {
  id: string;
  title: string;
  description: string | null;
  image_url: string | null;
  button_text: string | null;
  button_link: string | null;
  has_button: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export type GlobalPopupInsert = Omit<GlobalPopup, "id" | "created_at" | "updated_at">;
export type GlobalPopupUpdate = Partial<GlobalPopupInsert>;

export function useGlobalPopups() {
  const queryClient = useQueryClient();

  const { data: popups, isLoading } = useQuery({
    queryKey: ["global-popups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("global_popups")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as GlobalPopup[];
    },
  });

  const createPopup = useMutation({
    mutationFn: async (popup: GlobalPopupInsert) => {
      const { data, error } = await supabase
        .from("global_popups")
        .insert(popup)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-popups"] });
      toast.success("Pop-up criado com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating popup:", error);
      toast.error("Erro ao criar pop-up");
    },
  });

  const updatePopup = useMutation({
    mutationFn: async ({ id, ...updates }: GlobalPopupUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("global_popups")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-popups"] });
      toast.success("Pop-up atualizado com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating popup:", error);
      toast.error("Erro ao atualizar pop-up");
    },
  });

  const deletePopup = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("global_popups")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["global-popups"] });
      toast.success("Pop-up excluído com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting popup:", error);
      toast.error("Erro ao excluir pop-up");
    },
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("global_popups")
        .update({ is_active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["global-popups"] });
      toast.success(variables.is_active ? "Pop-up ativado!" : "Pop-up desativado!");
    },
    onError: (error) => {
      console.error("Error toggling popup:", error);
      toast.error("Erro ao alterar status do pop-up");
    },
  });

  return {
    popups,
    isLoading,
    createPopup,
    updatePopup,
    deletePopup,
    toggleActive,
  };
}

export function useActivePopup() {
  return useQuery({
    queryKey: ["active-popup"],
    queryFn: async () => {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from("global_popups")
        .select("*")
        .eq("is_active", true)
        .or(`start_date.is.null,start_date.lte.${now}`)
        .or(`end_date.is.null,end_date.gte.${now}`)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as GlobalPopup | null;
    },
  });
}
