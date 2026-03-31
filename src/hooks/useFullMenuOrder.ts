import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface MenuOrderItem {
  id: string;
  section: string;
  item_key: string;
  order_index: number;
}

export type OrderMap = Record<string, Record<string, number>>;

export function useFullMenuOrder() {
  const queryClient = useQueryClient();

  const { data: allMenuOrder, isLoading } = useQuery({
    queryKey: ["full-menu-order"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("menu_order")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      return data as MenuOrderItem[];
    },
  });

  // Build a map: { section: { item_key: order_index } }
  const orderMap: OrderMap = {};
  if (allMenuOrder) {
    for (const item of allMenuOrder) {
      if (!orderMap[item.section]) orderMap[item.section] = {};
      orderMap[item.section][item.item_key] = item.order_index;
    }
  }

  const getOrderedKeys = (section: string): string[] => {
    const sectionItems = allMenuOrder?.filter((i) => i.section === section) || [];
    return sectionItems.sort((a, b) => a.order_index - b.order_index).map((i) => i.item_key);
  };

  const updateOrderMutation = useMutation({
    mutationFn: async (updates: { section: string; items: { item_key: string; order_index: number }[] }[]) => {
      const allUpdates = updates.flatMap(({ section, items }) =>
        items.map((item) =>
          supabase
            .from("menu_order")
            .update({ order_index: item.order_index, updated_at: new Date().toISOString() })
            .eq("section", section)
            .eq("item_key", item.item_key)
        )
      );

      const results = await Promise.all(allUpdates);
      const errors = results.filter((r) => r.error);
      if (errors.length > 0) {
        throw new Error("Failed to update some items");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["full-menu-order"] });
      toast.success("Ordem do menu atualizada!");
    },
    onError: () => {
      toast.error("Erro ao atualizar ordem do menu");
    },
  });

  return {
    allMenuOrder,
    orderMap,
    isLoading,
    getOrderedKeys,
    updateOrder: updateOrderMutation.mutate,
    isUpdating: updateOrderMutation.isPending,
  };
}
