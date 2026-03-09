import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MenuOrderItem {
  id: string;
  section: string;
  item_key: string;
  order_index: number;
}

export function useMenuOrder(section: string = "vender") {
  const queryClient = useQueryClient();

  const { data: menuOrder, isLoading } = useQuery({
    queryKey: ["menu-order", section],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_order")
        .select("*")
        .eq("section", section)
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as MenuOrderItem[];
    },
  });

  const updateOrderMutation = useMutation({
    mutationFn: async (items: { item_key: string; order_index: number }[]) => {
      // Update each item's order_index
      const updates = items.map((item) =>
        supabase
          .from("menu_order")
          .update({ order_index: item.order_index, updated_at: new Date().toISOString() })
          .eq("section", section)
          .eq("item_key", item.item_key)
      );

      const results = await Promise.all(updates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error("Failed to update some items");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["menu-order", section] });
      toast.success("Ordem do menu atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar ordem do menu");
    },
  });

  return {
    menuOrder,
    isLoading,
    updateOrder: updateOrderMutation.mutate,
    isUpdating: updateOrderMutation.isPending,
  };
}
