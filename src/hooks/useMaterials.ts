import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, isSameDay, isWithinInterval } from "date-fns";
import type { Material, MaterialGallery, MaterialsByPeriod, MaterialsByCategory, MaterialsBySupplier } from "@/types/materials";

export function useMaterials() {
  const { data: materials, isLoading, error } = useQuery({
    queryKey: ["materials"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("materials")
        .select(`
          *,
          trade_suppliers (
            id,
            name
          )
        `)
        .eq("is_active", true)
        .order("published_at", { ascending: false });
      if (error) throw error;
      return data as Material[];
    },
  });

  const { data: suppliers } = useQuery({
    queryKey: ["trade-suppliers-for-filter"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trade_suppliers")
        .select("id, name")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return data;
    },
  });

  // Group materials into galleries by title + supplier + destination
  const groupIntoGalleries = (materials: Material[]): MaterialGallery[] => {
    const galleryMap = new Map<string, Material[]>();
    
    materials?.forEach((material) => {
      // Create a unique key based on title, supplier, and destination
      const key = `${material.title.trim().toLowerCase()}|${material.supplier_id || 'none'}|${(material.destination || '').trim().toLowerCase()}`;
      
      if (!galleryMap.has(key)) {
        galleryMap.set(key, []);
      }
      galleryMap.get(key)!.push(material);
    });

    // Convert map to array of galleries
    return Array.from(galleryMap.entries()).map(([key, mats]) => {
      const firstMaterial = mats[0];
      const hasVideos = mats.some(m => m.material_type === "Vídeo");
      const hasImages = mats.some(m => m.material_type === "Imagem");
      const hasPDFs = mats.some(m => m.material_type === "PDF" || m.material_type === "Lâmina");
      
      // Get the most recent publication date
      const sortedByDate = [...mats].sort((a, b) => 
        new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
      );
      
      // Find first available thumbnail
      let thumbnail: string | null = null;
      for (const mat of mats) {
        if (mat.thumbnail_url) {
          thumbnail = mat.thumbnail_url;
          break;
        }
        if (mat.material_type === "Imagem" && mat.file_url) {
          thumbnail = mat.file_url;
          break;
        }
      }

      return {
        id: key,
        title: firstMaterial.title,
        category: firstMaterial.category,
        destination: firstMaterial.destination,
        supplier_id: firstMaterial.supplier_id,
        trade_suppliers: firstMaterial.trade_suppliers,
        materials: mats,
        published_at: sortedByDate[0].published_at,
        thumbnail_url: thumbnail,
        fileCount: mats.length,
        hasVideos,
        hasImages,
        hasPDFs,
      };
    }).sort((a, b) => 
      new Date(b.published_at).getTime() - new Date(a.published_at).getTime()
    );
  };

  // Group galleries by time period
  const groupGalleriesByPeriod = (galleries: MaterialGallery[]): MaterialsByPeriod<MaterialGallery> => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);

    const result: MaterialsByPeriod<MaterialGallery> = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };

    galleries?.forEach((gallery) => {
      const publishedDate = new Date(gallery.published_at);

      if (isSameDay(publishedDate, now)) {
        result.today.push(gallery);
      } else if (isWithinInterval(publishedDate, { start: weekStart, end: todayStart })) {
        result.thisWeek.push(gallery);
      } else if (isWithinInterval(publishedDate, { start: monthStart, end: weekStart })) {
        result.thisMonth.push(gallery);
      } else {
        result.older.push(gallery);
      }
    });

    return result;
  };

  // Group galleries by category
  const groupGalleriesByCategory = (galleries: MaterialGallery[]): MaterialsByCategory<MaterialGallery> => {
    const result: MaterialsByCategory<MaterialGallery> = {};
    
    galleries?.forEach((gallery) => {
      if (!result[gallery.category]) {
        result[gallery.category] = [];
      }
      result[gallery.category].push(gallery);
    });

    return result;
  };

  // Group galleries by supplier
  const groupGalleriesBySupplier = (galleries: MaterialGallery[]): MaterialsBySupplier<MaterialGallery> => {
    const result: MaterialsBySupplier<MaterialGallery> = {};
    
    galleries?.forEach((gallery) => {
      const supplierName = gallery.trade_suppliers?.name || "Outros";
      if (!result[supplierName]) {
        result[supplierName] = [];
      }
      result[supplierName].push(gallery);
    });

    return result;
  };

  // Filter materials (for galleries, we filter the underlying materials first)
  const filterMaterials = (
    materials: Material[] | undefined,
    searchTerm: string,
    category: string,
    type: string,
    supplierId: string
  ): Material[] => {
    if (!materials) return [];

    return materials.filter((material) => {
      const matchesSearch = 
        material.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (material.destination?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
      const matchesCategory = category === "Todas" || material.category === category;
      const matchesType = type === "Todos" || material.material_type === type;
      const matchesSupplier = supplierId === "Todos" || material.supplier_id === supplierId;
      
      return matchesSearch && matchesCategory && matchesType && matchesSupplier;
    });
  };

  return {
    materials,
    suppliers: suppliers || [],
    isLoading,
    error,
    groupIntoGalleries,
    groupGalleriesByPeriod,
    groupGalleriesByCategory,
    groupGalleriesBySupplier,
    filterMaterials,
  };
}

// Re-export types for convenience
export type { Material, MaterialGallery } from "@/types/materials";
