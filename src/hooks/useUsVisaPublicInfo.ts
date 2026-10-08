import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Espera para a próxima entrevista (não é prazo de emissão do visto). */
export interface UsVisaWaitTime {
  months: number | null;
  qualifier: string | null;
  display_pt: string | null;
}

export interface UsVisaPublicInfo {
  key: "b1_b2_brazil";
  mrv_fee_usd: number | null;
  /** NULL = não confirmado oficialmente (nunca significa ausência de taxas). */
  additional_fees: unknown | null;
  interview_wait_times: Record<string, UsVisaWaitTime> | null;
  fees_source_url: string | null;
  wait_times_source_url: string | null;
  fees_source_updated_at: string | null;
  wait_times_source_updated_at: string | null;
  checked_at: string | null;
  updated_at: string | null;
}

/** Leitura pública e opt-in dos dados oficiais B1/B2 (registro único). */
export function useUsVisaPublicInfo(enabled = true) {
  return useQuery({
    queryKey: ["us-visa-public-info", "b1_b2_brazil"],
    enabled,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async (): Promise<UsVisaPublicInfo | null> => {
      const { data, error } = await (supabase as any)
        .from("us_visa_public_info")
        .select(
          "key, mrv_fee_usd, additional_fees, interview_wait_times, fees_source_url, wait_times_source_url, fees_source_updated_at, wait_times_source_updated_at, checked_at, updated_at",
        )
        .eq("key", "b1_b2_brazil")
        .maybeSingle();
      if (error) return null;
      return (data as UsVisaPublicInfo) ?? null;
    },
  });
}
