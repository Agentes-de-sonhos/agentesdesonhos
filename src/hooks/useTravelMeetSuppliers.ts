import { useQuery } from "@tanstack/react-query";

const TRAVELMEET_API = "https://yapuxdnxbvsvikcdrzmu.supabase.co/functions/v1/public-suppliers";

interface TravelMeetSupplier {
  id: string;
  name: string;
  category?: string;
  logo_url?: string;
  website?: string;
  instagram?: string;
  specialties?: string[];
  description?: string;
  [key: string]: unknown;
}

interface TravelMeetResponse {
  suppliers: TravelMeetSupplier[];
  total: number;
  limit: number;
  offset: number;
}

export function useTravelMeetSuppliers() {
  return useQuery({
    queryKey: ["travelmeet-suppliers"],
    queryFn: async (): Promise<TravelMeetSupplier[]> => {
      const allSuppliers: TravelMeetSupplier[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;

      while (hasMore) {
        const res = await fetch(`${TRAVELMEET_API}?limit=${limit}&offset=${offset}`);
        if (!res.ok) throw new Error("Erro ao buscar fornecedores do TravelMeet");
        const data: TravelMeetResponse = await res.json();
        allSuppliers.push(...data.suppliers);
        offset += limit;
        hasMore = allSuppliers.length < data.total;
      }

      return allSuppliers;
    },
    staleTime: 1000 * 60 * 10, // 10 min cache
    retry: 2,
  });
}
