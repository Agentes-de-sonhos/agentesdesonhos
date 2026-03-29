import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useSupplierLikes() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: allLikes = [] } = useQuery({
    queryKey: ["supplier-likes-all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("supplier_likes")
        .select("supplier_id, supplier_source, user_id");
      if (error) throw error;
      return data || [];
    },
  });

  const getLikeCount = (supplierId: string, source: string) =>
    allLikes.filter((l) => l.supplier_id === supplierId && l.supplier_source === source).length;

  const hasLiked = (supplierId: string, source: string) =>
    !!user && allLikes.some((l) => l.supplier_id === supplierId && l.supplier_source === source && l.user_id === user.id);

  const toggleLike = useMutation({
    mutationFn: async ({ supplierId, source }: { supplierId: string; source: string }) => {
      if (!user) throw new Error("Não autenticado");
      const liked = hasLiked(supplierId, source);
      if (liked) {
        const { error } = await supabase
          .from("supplier_likes")
          .delete()
          .eq("supplier_id", supplierId)
          .eq("supplier_source", source)
          .eq("user_id", user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("supplier_likes")
          .insert({ supplier_id: supplierId, supplier_source: source, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["supplier-likes-all"] });
    },
  });

  return { getLikeCount, hasLiked, toggleLike };
}

export function useSupplierReviewStats() {
  return useQuery({
    queryKey: ["supplier-review-stats-all"],
    queryFn: async () => {
      const [{ data: supplierData, error: supplierError }, { data: operatorData, error: operatorError }, { data: cruiseData, error: cruiseError }] = await Promise.all([
        supabase
          .from("supplier_reviews")
          .select("supplier_id, rating"),
        supabase
          .from("operator_reviews")
          .select("operator_id, rating"),
        supabase
          .from("cruise_reviews")
          .select("cruise_id, rating"),
      ]);

      if (supplierError) throw supplierError;
      if (operatorError) throw operatorError;
      if (cruiseError) throw cruiseError;

      const map: Record<string, { total: number; count: number }> = {};

      for (const r of supplierData || []) {
        const key = `supplier:${r.supplier_id}`;
        if (!map[key]) map[key] = { total: 0, count: 0 };
        map[key].total += r.rating;
        map[key].count += 1;
      }

      for (const r of operatorData || []) {
        const key = `operator:${r.operator_id}`;
        if (!map[key]) map[key] = { total: 0, count: 0 };
        map[key].total += r.rating;
        map[key].count += 1;
      }

      for (const r of (cruiseData || []) as any[]) {
        const key = `cruise:${r.cruise_id}`;
        if (!map[key]) map[key] = { total: 0, count: 0 };
        map[key].total += r.rating;
        map[key].count += 1;
      }

      return map;
    },
  });
}
