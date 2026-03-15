import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const FEATURED_LABELS = [
  { value: "oferta_especial", emoji: "🔥", text: "Oferta Especial" },
  { value: "mais_vendido", emoji: "⭐", text: "Mais Vendido" },
  { value: "ultimas_vagas", emoji: "⏳", text: "Últimas Vagas" },
  { value: "melhor_preco", emoji: "💰", text: "Melhor Preço" },
  { value: "recomendado", emoji: "🌟", text: "Recomendado" },
] as const;

export const MAX_FEATURED = 3;

export function getFeaturedLabel(value: string | null) {
  return FEATURED_LABELS.find(l => l.value === value) || null;
}

export interface ShowcaseItem {
  id: string;
  showcase_id: string;
  user_id: string;
  material_id: string | null;
  image_url: string | null;
  gallery_urls: string[];
  category: string;
  subcategory: string | null;
  action_type: string;
  action_url: string | null;
  order_index: number;
  expires_at: string | null;
  is_active: boolean;
  is_featured: boolean;
  featured_order: number;
  featured_label: string | null;
  created_at: string;
  updated_at: string;
  // Joined material data
  materials?: {
    id: string;
    title: string;
    file_url: string | null;
    thumbnail_url: string | null;
    is_active: boolean;
    is_permanent: boolean;
    created_at: string;
  } | null;
}

export interface Showcase {
  id: string;
  user_id: string;
  slug: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function useShowcase() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: showcase, isLoading: loadingShowcase } = useQuery({
    queryKey: ["my-showcase", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_showcases")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as Showcase | null;
    },
    enabled: !!user?.id,
  });

  const { data: items, isLoading: loadingItems } = useQuery({
    queryKey: ["showcase-items", showcase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_items")
        .select(`*, materials(id, title, file_url, thumbnail_url, is_active, is_permanent, created_at)`)
        .eq("showcase_id", showcase!.id)
        .eq("user_id", user!.id)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as ShowcaseItem[];
    },
    enabled: !!showcase?.id && !!user?.id,
  });

  const { data: availableMaterials } = useQuery({
    queryKey: ["showcase-available-materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select("id, title, file_url, thumbnail_url, category, destination, material_type, is_permanent, created_at, supplier_id, trade_suppliers(id, name)")
        .eq("is_active", true)
        .is("trail_id", null)
        .in("material_type", ["Imagem", "Lâmina"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const createShowcase = useMutation({
    mutationFn: async (slug: string) => {
      const { data, error } = await supabase
        .from("agency_showcases")
        .insert({ user_id: user!.id, slug })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-showcase"] });
      toast.success("Vitrine criada com sucesso!");
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Este slug já está em uso. Escolha outro nome.");
      } else {
        toast.error("Erro ao criar vitrine");
      }
    },
  });

  const addItem = useMutation({
    mutationFn: async (item: {
      material_id?: string;
      image_url?: string;
      gallery_urls?: string[];
      category: string;
      subcategory?: string;
      action_type: string;
      action_url?: string;
      expires_at?: string;
    }) => {
      const maxOrder = items?.length ? Math.max(...items.map(i => i.order_index)) + 1 : 0;
      const { data, error } = await supabase
        .from("showcase_items")
        .insert({
          showcase_id: showcase!.id,
          user_id: user!.id,
          material_id: item.material_id || null,
          image_url: item.image_url || null,
          gallery_urls: item.gallery_urls || [],
          category: item.category,
          subcategory: item.subcategory || null,
          action_type: item.action_type,
          action_url: item.action_url || null,
          order_index: maxOrder,
          expires_at: item.expires_at || null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcase-items"] });
      toast.success("Lâmina adicionada à vitrine!");
    },
    onError: () => toast.error("Erro ao adicionar lâmina"),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ShowcaseItem> & { id: string }) => {
      const { error } = await supabase
        .from("showcase_items")
        .update(updates)
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcase-items"] });
    },
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("showcase_items")
        .delete()
        .eq("id", id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcase-items"] });
      toast.success("Lâmina removida da vitrine");
    },
    onError: () => toast.error("Erro ao remover lâmina"),
  });

  const reorderItems = useMutation({
    mutationFn: async (orderedIds: string[]) => {
      const updates = orderedIds.map((id, index) =>
        supabase.from("showcase_items").update({ order_index: index }).eq("id", id).eq("user_id", user!.id)
      );
      await Promise.all(updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["showcase-items"] });
    },
  });

  const uploadImage = async (file: File): Promise<string> => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${user!.id}/${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("showcase-images").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("showcase-images").getPublicUrl(path);
    return data.publicUrl;
  };

  const uploadMultipleImages = async (files: File[]): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files) {
      const url = await uploadImage(file);
      urls.push(url);
    }
    return urls;
  };

  return {
    showcase,
    items: items || [],
    availableMaterials: availableMaterials || [],
    loadingShowcase,
    loadingItems,
    createShowcase,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    uploadImage,
  };
}

// Public hook for the showcase page (no auth needed)
export function usePublicShowcase(slug: string | undefined) {
  const { data: showcase, isLoading: loadingShowcase } = useQuery({
    queryKey: ["public-showcase", slug],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agency_showcases")
        .select("*")
        .eq("slug", slug!)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data as Showcase | null;
    },
    enabled: !!slug,
  });

  const { data: profile } = useQuery({
    queryKey: ["public-showcase-profile", showcase?.user_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("name, phone, avatar_url, agency_name, agency_logo_url, city, state")
        .eq("user_id", showcase!.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!showcase?.user_id,
  });

  const { data: items } = useQuery({
    queryKey: ["public-showcase-items", showcase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_items")
        .select(`*, materials(id, title, file_url, thumbnail_url, is_active, is_permanent, created_at)`)
        .eq("showcase_id", showcase!.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      // Filter: items from materials that expired (non-permanent + older than 7 days)
      const now = new Date();
      return (data as ShowcaseItem[]).filter(item => {
        // Check item-level expiry
        if (item.expires_at && new Date(item.expires_at) < now) return false;
        // Check material-level expiry (7 day rule for non-permanent)
        if (item.materials) {
          if (!item.materials.is_active) return false;
          if (!item.materials.is_permanent) {
            const createdAt = new Date(item.materials.created_at);
            const sevenDaysAgo = new Date();
            sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
            if (createdAt < sevenDaysAgo) return false;
          }
        }
        return true;
      });
    },
    enabled: !!showcase?.id,
  });

  const trackEvent = async (showcaseId: string, eventType: string, itemId?: string) => {
    await supabase.from("showcase_stats").insert({
      showcase_id: showcaseId,
      event_type: eventType,
      item_id: itemId || null,
    });
  };

  return {
    showcase,
    profile,
    items: items || [],
    loadingShowcase,
    trackEvent,
  };
}
