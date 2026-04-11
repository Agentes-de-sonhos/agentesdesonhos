import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface ShowcaseAutoOverride {
  id: string;
  showcase_id: string;
  user_id: string;
  material_key: string;
  is_hidden: boolean;
  custom_order: number | null;
  created_at: string;
  updated_at: string;
}

export function useShowcaseOverrides(showcaseId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: overrides, isLoading } = useQuery({
    queryKey: ["showcase-overrides", showcaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_auto_overrides")
        .select("*")
        .eq("showcase_id", showcaseId!)
        .eq("user_id", user!.id);
      if (error) throw error;
      return data as ShowcaseAutoOverride[];
    },
    enabled: !!showcaseId && !!user?.id,
  });

  const overrideMap = new Map(
    (overrides || []).map((o) => [o.material_key, o])
  );

  const upsertOverride = useMutation({
    mutationFn: async (params: { material_key: string; is_hidden?: boolean; custom_order?: number | null }) => {
      const existing = overrideMap.get(params.material_key);
      if (existing) {
        const updates: any = {};
        if (params.is_hidden !== undefined) updates.is_hidden = params.is_hidden;
        if (params.custom_order !== undefined) updates.custom_order = params.custom_order;
        const { error } = await supabase
          .from("showcase_auto_overrides")
          .update(updates)
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("showcase_auto_overrides")
          .insert({
            showcase_id: showcaseId!,
            user_id: user!.id,
            material_key: params.material_key,
            is_hidden: params.is_hidden ?? false,
            custom_order: params.custom_order ?? null,
          });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcase-overrides", showcaseId] });
    },
  });

  const toggleVisibility = async (materialKey: string) => {
    const current = overrideMap.get(materialKey);
    const newHidden = !(current?.is_hidden ?? false);
    await upsertOverride.mutateAsync({ material_key: materialKey, is_hidden: newHidden });
    toast.success(newHidden ? "Lâmina ocultada da vitrine" : "Lâmina visível na vitrine");
  };

  const saveOrder = async (orderedKeys: string[]) => {
    const updates = orderedKeys.map((key, index) =>
      upsertOverride.mutateAsync({ material_key: key, custom_order: index })
    );
    await Promise.all(updates);
  };

  return {
    overrides: overrides || [],
    overrideMap,
    isLoading,
    toggleVisibility,
    saveOrder,
    upsertOverride,
  };
}

/** Read-only hook for public showcase - fetches overrides without auth */
export function usePublicShowcaseOverrides(showcaseId: string | undefined) {
  const { data: overrides } = useQuery({
    queryKey: ["public-showcase-overrides", showcaseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_auto_overrides")
        .select("material_key, is_hidden, custom_order")
        .eq("showcase_id", showcaseId!);
      if (error) throw error;
      return data as Pick<ShowcaseAutoOverride, "material_key" | "is_hidden" | "custom_order">[];
    },
    enabled: !!showcaseId,
  });

  return {
    overrideMap: new Map((overrides || []).map((o) => [o.material_key, o])),
  };
}
