import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface SalesLanding {
  id: string;
  user_id: string;
  slug: string;
  headline: string;
  subheadline: string | null;
  description: string | null;
  cta_text: string;
  image_url: string | null;
  primary_color: string;
  agent_whatsapp: string;
  agent_name: string | null;
  views_count: number;
  leads_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

export function useSalesLandings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const list = useQuery({
    queryKey: ["sales-landings", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("sales_landings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as SalesLanding[];
    },
    enabled: !!user,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });

  const create = useMutation({
    mutationFn: async (payload: Omit<SalesLanding, "id" | "user_id" | "views_count" | "leads_count" | "created_at" | "updated_at" | "is_active"> & { is_active?: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("sales_landings")
        .insert({ ...payload, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as SalesLanding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-landings"] });
      toast.success("Página de vendas criada com sucesso!");
    },
    onError: (err: Error) => {
      const msg = err.message || "Erro ao criar página";
      if (msg.includes("Limite") || msg.includes("disponíveis apenas")) {
        toast.error(msg);
      } else if (msg.includes("duplicate") || msg.includes("unique")) {
        toast.error("Esse link já está em uso. Escolha outro.");
      } else {
        toast.error("Erro ao criar página de vendas");
      }
    },
  });

  const update = useMutation({
    mutationFn: async ({ id, ...patch }: Partial<SalesLanding> & { id: string }) => {
      const { data, error } = await supabase
        .from("sales_landings")
        .update(patch)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data as SalesLanding;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-landings"] });
      toast.success("Alterações salvas!");
    },
    onError: (err: Error) => {
      if ((err.message || "").match(/duplicate|unique/i)) {
        toast.error("Esse link já está em uso.");
      } else {
        toast.error("Erro ao salvar alterações");
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("sales_landings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales-landings"] });
      toast.success("Página excluída");
    },
    onError: () => toast.error("Erro ao excluir página"),
  });

  return { list, create, update, remove };
}

export function useSalesLanding(id: string | undefined) {
  return useQuery({
    queryKey: ["sales-landing", id],
    queryFn: async () => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("sales_landings")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as SalesLanding | null;
    },
    enabled: !!id,
    staleTime: 30_000,
  });
}