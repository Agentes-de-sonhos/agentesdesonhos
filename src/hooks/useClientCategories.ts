import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { ClientCategory, ClientSubcategory } from "@/types/crm";

export function useClientCategories() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ["client-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_categories")
        .select("*")
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ClientCategory[];
    },
    staleTime: 10 * 60 * 1000,
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["client-subcategories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("client_subcategories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return data as ClientSubcategory[];
    },
    staleTime: 5 * 60 * 1000,
  });

  const getSubcategoriesForCategory = (categoryId: string) =>
    subcategories.filter((s) => s.category_id === categoryId);

  const createSubcategoryMutation = useMutation({
    mutationFn: async ({ name, category_id }: { name: string; category_id: string }) => {
      const { data, error } = await supabase
        .from("client_subcategories")
        .insert({ name: name.trim(), category_id })
        .select()
        .single();
      if (error) throw error;
      return data as ClientSubcategory;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["client-subcategories"] });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar subcategoria", description: error.message, variant: "destructive" });
    },
  });

  return {
    categories,
    subcategories,
    categoriesLoading,
    subcategoriesLoading,
    getSubcategoriesForCategory,
    createSubcategory: createSubcategoryMutation.mutateAsync,
    isCreatingSubcategory: createSubcategoryMutation.isPending,
  };
}
