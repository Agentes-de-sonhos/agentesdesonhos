import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface VitrineCategory {
  id: string;
  name: string;
  order_index: number;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const QUERY_KEY = "vitrine-categories";

export function useVitrineCategories() {
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: [QUERY_KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("vitrine_categories")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as VitrineCategory[];
    },
  });

  const addCategory = useMutation({
    mutationFn: async (name: string) => {
      const maxOrder = Math.max(0, ...categories.map((c) => c.order_index));
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("vitrine_categories")
        .insert({ name, order_index: maxOrder + 1, created_by: user.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from("vitrine_categories")
        .update({ name })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const removeCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("vitrine_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: [QUERY_KEY] }),
  });

  const categoryNames = categories.map((c) => c.name);

  return { categories, categoryNames, isLoading, addCategory, updateCategory, removeCategory };
}
