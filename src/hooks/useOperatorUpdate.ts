import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useOperatorUpdate(id: string, table: "tour_operators" | "tour_operators") {
  const queryClient = useQueryClient();
  const queryKey = table === "tour_operators" ? "tour-operator" : "trade-supplier";

  return useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase
        .from(table)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [queryKey, id] });
      toast.success("Atualizado com sucesso");
    },
    onError: (err: any) => {
      toast.error("Erro ao salvar: " + err.message);
    },
  });
}
