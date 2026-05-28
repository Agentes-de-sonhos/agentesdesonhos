import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type LeadSource = "conversational" | "sales_landing";

export interface UnifiedLead {
  id: string;
  source: LeadSource;
  source_label: string;
  lead_name: string;
  lead_phone: string;
  destination: string | null;
  email: string | null;
  created_at: string;
}

export function useAllLeads() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["all-leads", user?.id],
    queryFn: async (): Promise<UnifiedLead[]> => {
      if (!user?.id) return [];

      const [convRes, landingRes] = await Promise.all([
        supabase
          .from("lead_captures")
          .select("id, lead_name, lead_phone, destination, created_at")
          .eq("agent_user_id", user.id),
        supabase
          .from("sales_landing_leads")
          .select("id, lead_name, lead_phone, created_at, landing_id, sales_landings(headline)")
          .eq("user_id", user.id),
      ]);

      if (convRes.error) throw convRes.error;
      if (landingRes.error) throw landingRes.error;

      const conv: UnifiedLead[] = (convRes.data ?? []).map((l: any) => ({
        id: l.id,
        source: "conversational",
        source_label: "Formulário Conversacional",
        lead_name: l.lead_name,
        lead_phone: l.lead_phone,
        destination: l.destination,
        email: null,
        created_at: l.created_at,
      }));

      const landing: UnifiedLead[] = (landingRes.data ?? []).map((l: any) => ({
        id: l.id,
        source: "sales_landing",
        source_label: l.sales_landings?.headline
          ? `Página de Vendas · ${l.sales_landings.headline}`
          : "Página de Vendas",
        lead_name: l.lead_name,
        lead_phone: l.lead_phone,
        destination: null,
        email: null,
        created_at: l.created_at,
      }));

      return [...conv, ...landing].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 2,
  });
}
