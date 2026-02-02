import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { startOfDay, startOfWeek, startOfMonth, isAfter, isSameDay, isWithinInterval, subDays } from "date-fns";

interface Material {
  id: string;
  title: string;
  material_type: string;
  category: string;
  destination?: string | null;
  file_url?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  published_at: string;
  supplier_id?: string | null;
  is_active: boolean;
  trade_suppliers?: {
    id: string;
    name: string;
  } | null;
}

interface MaterialsByPeriod {
  today: Material[];
  thisWeek: Material[];
  thisMonth: Material[];
  older: Material[];
}

interface MaterialsByCategory {
  [category: string]: Material[];
}

interface MaterialsBySupplier {
  [supplierName: string]: Material[];
}

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

  // Group materials by time period
  const groupByPeriod = (materials: Material[]): MaterialsByPeriod => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const monthStart = startOfMonth(now);

    const result: MaterialsByPeriod = {
      today: [],
      thisWeek: [],
      thisMonth: [],
      older: [],
    };

    materials?.forEach((material) => {
      const publishedDate = new Date(material.published_at);

      if (isSameDay(publishedDate, now)) {
        result.today.push(material);
      } else if (isWithinInterval(publishedDate, { start: weekStart, end: todayStart })) {
        result.thisWeek.push(material);
      } else if (isWithinInterval(publishedDate, { start: monthStart, end: weekStart })) {
        result.thisMonth.push(material);
      } else {
        result.older.push(material);
      }
    });

    return result;
  };

  // Group materials by category
  const groupByCategory = (materials: Material[]): MaterialsByCategory => {
    const result: MaterialsByCategory = {};
    
    materials?.forEach((material) => {
      if (!result[material.category]) {
        result[material.category] = [];
      }
      result[material.category].push(material);
    });

    return result;
  };

  // Group materials by supplier
  const groupBySupplier = (materials: Material[]): MaterialsBySupplier => {
    const result: MaterialsBySupplier = {};
    
    materials?.forEach((material) => {
      const supplierName = material.trade_suppliers?.name || "Outros";
      if (!result[supplierName]) {
        result[supplierName] = [];
      }
      result[supplierName].push(material);
    });

    return result;
  };

  // Filter materials
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
    groupByPeriod,
    groupByCategory,
    groupBySupplier,
    filterMaterials,
  };
}
