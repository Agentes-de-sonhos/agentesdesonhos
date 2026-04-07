import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export interface Seller {
  id: string;
  user_id: string;
  name: string;
  default_commission_percent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useSellers() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: sellers = [], isLoading } = useQuery({
    queryKey: ["sellers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sellers")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data as Seller[];
    },
    enabled: !!user,
  });

  const createSeller = useMutation({
    mutationFn: async (values: { name: string; default_commission_percent: number }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("sellers")
        .insert({ user_id: user.id, ...values })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      toast({ title: "Vendedora cadastrada" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateSeller = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name: string; default_commission_percent: number }) => {
      const { error } = await supabase.from("sellers").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      toast({ title: "Vendedora atualizada" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const deleteSeller = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sellers").update({ is_active: false }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sellers"] });
      toast({ title: "Vendedora removida" });
    },
    onError: (e) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { sellers, isLoading, createSeller, updateSeller, deleteSeller };
}
