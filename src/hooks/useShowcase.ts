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
  tagline: string | null;
  showcase_mode: string;
  auto_supplier_ids: string[];
  max_auto_items: number;
  auto_categories: string[];
  og_title: string | null;
  og_description: string | null;
  disclaimer_text: string | null;
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
        .select("id, title, file_url, thumbnail_url, category, destination, material_type, is_permanent, created_at, supplier_id, tour_operators(id, name)")
        .eq("is_active", true)
        .is("trail_id", null)
        .in("material_type", ["Imagem", "Lâmina"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const { data: allSuppliers } = useQuery({
    queryKey: ["showcase-all-suppliers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_operators")
        .select("id, name, logo_url, category")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Auto-preview: fetch the same materials the public showcase would show
  const isAutoOrCombined = showcase?.showcase_mode === "auto" || showcase?.showcase_mode === "combinado";
  const adminAutoSupplierIds = showcase?.auto_supplier_ids || [];
  const adminAutoCategories = showcase?.auto_categories || [];
  const adminMaxAutoItems = showcase?.max_auto_items || 20;

  const { data: autoPreviewItems, isLoading: loadingAutoPreview } = useQuery({
    queryKey: ["showcase-auto-preview", showcase?.id, adminAutoSupplierIds, adminAutoCategories, adminMaxAutoItems],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let query = supabase
        .from("materials")
        .select("id, title, file_url, thumbnail_url, category, destination, supplier_id, is_permanent, created_at, batch_id, order_index, tour_operators(id, name)")
        .eq("is_active", true)
        .is("trail_id", null)
        .in("material_type", ["Imagem", "Lâmina"])
        .or(`created_at.gte.${sevenDaysAgo.toISOString()},is_permanent.eq.true`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (adminAutoSupplierIds.length > 0) {
        query = query.in("supplier_id", adminAutoSupplierIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (adminAutoCategories.length > 0) {
        filtered = filtered.filter(m => adminAutoCategories.includes(m.category));
      }

      // Group by batch_id
      const batchMap = new Map<string, typeof filtered>();
      const unbatched: typeof filtered = [];
      filtered.forEach(m => {
        if (m.batch_id) {
          if (!batchMap.has(m.batch_id)) batchMap.set(m.batch_id, []);
          batchMap.get(m.batch_id)!.push(m);
        } else {
          unbatched.push(m);
        }
      });
      batchMap.forEach(mats => mats.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));

      const result: { material_key: string; image_url: string | null; title: string; supplier_name: string | null; category: string; is_permanent: boolean; created_at: string; gallery_count: number }[] = [];

      batchMap.forEach((mats, batchId) => {
        const first = mats[0];
        const urls = mats.map(m => m.file_url || m.thumbnail_url).filter(Boolean);
        result.push({
          material_key: `auto-batch-${batchId}`,
          image_url: urls[0] || null,
          title: first.title || "Sem título",
          supplier_name: (first as any).tour_operators?.name || null,
          category: first.category || "Geral",
          is_permanent: first.is_permanent || false,
          created_at: first.created_at,
          gallery_count: urls.length,
        });
      });

      unbatched.forEach(m => {
        result.push({
          material_key: `auto-${m.id}`,
          image_url: m.file_url || m.thumbnail_url || null,
          title: m.title || "Sem título",
          supplier_name: (m as any).tour_operators?.name || null,
          category: m.category || "Geral",
          is_permanent: m.is_permanent || false,
          created_at: m.created_at,
          gallery_count: 1,
        });
      });

      return result.slice(0, adminMaxAutoItems);
    },
    enabled: !!showcase?.id && isAutoOrCombined && adminAutoSupplierIds.length > 0,
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

  const updateShowcase = useMutation({
    mutationFn: async (updates: Partial<Showcase>) => {
      const { error } = await supabase
        .from("agency_showcases")
        .update(updates as any)
        .eq("id", showcase!.id)
        .eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-showcase"] });
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
    allSuppliers: allSuppliers || [],
    autoPreviewItems: autoPreviewItems || [],
    loadingShowcase,
    loadingItems,
    loadingAutoPreview: loadingAutoPreview && isAutoOrCombined,
    createShowcase,
    updateShowcase,
    addItem,
    updateItem,
    removeItem,
    reorderItems,
    uploadImage,
    uploadMultipleImages,
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
        .rpc("get_public_profile", { _user_id: showcase!.user_id });
      if (error) throw error;
      return data?.[0] || null;
    },
    enabled: !!showcase?.user_id,
  });

  const { data: manualItems } = useQuery({
    queryKey: ["public-showcase-items", showcase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_items")
        .select(`*, materials(id, title, file_url, thumbnail_url, is_active, is_permanent, created_at)`)
        .eq("showcase_id", showcase!.id)
        .eq("is_active", true)
        .order("order_index", { ascending: true });
      if (error) throw error;
      const now = new Date();
      return (data as ShowcaseItem[]).filter(item => {
        if (item.expires_at && new Date(item.expires_at) < now) return false;
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

  // Auto-mode: fetch materials from selected suppliers
  const isAutoMode = showcase?.showcase_mode === "auto" || showcase?.showcase_mode === "combinado";
  const autoSupplierIds = showcase?.auto_supplier_ids || [];
  const autoCategories = showcase?.auto_categories || [];
  const maxAutoItems = showcase?.max_auto_items || 20;

  // Fetch overrides for this showcase
  const { data: autoOverrides } = useQuery({
    queryKey: ["public-showcase-overrides", showcase?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("showcase_auto_overrides")
        .select("material_key, is_hidden, custom_order")
        .eq("showcase_id", showcase!.id);
      if (error) throw error;
      return data as { material_key: string; is_hidden: boolean; custom_order: number | null }[];
    },
    enabled: !!showcase?.id && isAutoMode,
  });

  const overridesMap = new Map((autoOverrides || []).map(o => [o.material_key, o]));

  const { data: autoMaterials } = useQuery({
    queryKey: ["public-showcase-auto", showcase?.id, autoSupplierIds, autoCategories],
    queryFn: async () => {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      let query = supabase
        .from("materials")
        .select("id, title, file_url, thumbnail_url, category, destination, supplier_id, is_permanent, created_at, batch_id, order_index, tour_operators(id, name)")
        .eq("is_active", true)
        .is("trail_id", null)
        .in("material_type", ["Imagem", "Lâmina"])
        .or(`created_at.gte.${sevenDaysAgo.toISOString()},is_permanent.eq.true`)
        .order("created_at", { ascending: false })
        .limit(200);

      if (autoSupplierIds.length > 0) {
        query = query.in("supplier_id", autoSupplierIds);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filtered = data || [];
      if (autoCategories.length > 0) {
        filtered = filtered.filter(m => autoCategories.includes(m.category));
      }

      // Group materials by batch_id into gallery cards
      const batchMap = new Map<string, typeof filtered>();
      const unbatched: typeof filtered = [];

      filtered.forEach(m => {
        if (m.batch_id) {
          if (!batchMap.has(m.batch_id)) batchMap.set(m.batch_id, []);
          batchMap.get(m.batch_id)!.push(m);
        } else {
          unbatched.push(m);
        }
      });

      // Sort each batch by order_index
      batchMap.forEach(mats => mats.sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0)));

      const result: (ShowcaseItem & { _supplierName?: string | null })[] = [];
      let idx = 0;

      // Batched materials → one card per batch with gallery_urls
      batchMap.forEach((mats, batchId) => {
        const first = mats[0];
        const galleryUrls = mats
          .map(m => m.file_url || m.thumbnail_url)
          .filter((url): url is string => !!url);
        if (galleryUrls.length === 0) return;

        result.push({
          id: `auto-batch-${batchId}`,
          showcase_id: showcase!.id,
          user_id: showcase!.user_id,
          material_id: first.id,
          image_url: galleryUrls[0],
          gallery_urls: galleryUrls,
          category: first.category || "Geral",
          subcategory: first.destination || null,
          action_type: "whatsapp",
          action_url: null,
          order_index: idx++,
          expires_at: null,
          is_active: true,
          is_featured: false,
          featured_order: 0,
          featured_label: null,
          created_at: first.created_at,
          updated_at: first.created_at,
          materials: {
            id: first.id,
            title: first.title,
            file_url: first.file_url,
            thumbnail_url: first.thumbnail_url,
            is_active: true,
            is_permanent: first.is_permanent || false,
            created_at: first.created_at,
          },
          _supplierName: (first as any).tour_operators?.name || null,
        } as any);
      });

      // Unbatched materials → one card each
      unbatched.forEach(m => {
        result.push({
          id: `auto-${m.id}`,
          showcase_id: showcase!.id,
          user_id: showcase!.user_id,
          material_id: m.id,
          image_url: m.file_url || m.thumbnail_url,
          gallery_urls: [],
          category: m.category || "Geral",
          subcategory: m.destination || null,
          action_type: "whatsapp",
          action_url: null,
          order_index: idx++,
          expires_at: null,
          is_active: true,
          is_featured: false,
          featured_order: 0,
          featured_label: null,
          created_at: m.created_at,
          updated_at: m.created_at,
          materials: {
            id: m.id,
            title: m.title,
            file_url: m.file_url,
            thumbnail_url: m.thumbnail_url,
            is_active: true,
            is_permanent: m.is_permanent || false,
            created_at: m.created_at,
          },
          _supplierName: (m as any).tour_operators?.name || null,
        } as any);
      });

      // Limit total cards
      return result.slice(0, maxAutoItems);
    },
    enabled: !!showcase?.id && isAutoMode && autoSupplierIds.length > 0,
  });

  // Combine manual + auto items
  const items = (() => {
    const manual = manualItems || [];
    if (!isAutoMode) return manual;
    const auto = autoMaterials || [];
    // In combinado mode, manual first then auto. In pure auto, only auto.
    if (showcase?.showcase_mode === "combinado") {
      // Filter out auto items that are already in manual (by material_id)
      const manualMaterialIds = new Set(manual.map(m => m.material_id).filter(Boolean));
      const uniqueAuto = auto.filter(a => !manualMaterialIds.has(a.material_id));
      return [...manual, ...uniqueAuto];
    }
    return auto;
  })();

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
    items,
    loadingShowcase,
    trackEvent,
  };
}
