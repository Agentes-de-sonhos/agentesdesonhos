import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { PassengerData, TripData, RequirementsResult } from "@/types/travelRequirements";

interface ConsultationResponse {
  id?: string;
  result: RequirementsResult;
  confidence_score: number;
  model_used: string;
}

export function useTravelRequirements() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ConsultationResponse | null>(null);

  const consult = async (passenger_data: PassengerData, trip_data: TripData) => {
    setLoading(true);
    try {
      const { data: resp, error } = await supabase.functions.invoke("check-travel-requirements", {
        body: { passenger_data, trip_data },
      });
      if (error) throw error;
      if (resp?.error) throw new Error(resp.error);
      setData(resp as ConsultationResponse);
      return resp as ConsultationResponse;
    } catch (e: any) {
      const msg = e?.message || "Erro ao consultar requisitos da viagem.";
      toast.error(msg);
      throw e;
    } finally {
      setLoading(false);
    }
  };

  const reset = () => setData(null);

  return { consult, loading, data, reset };
}