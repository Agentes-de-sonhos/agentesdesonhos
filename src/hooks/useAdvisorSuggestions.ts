import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export type AdvisorType = "dining" | "attraction" | "shopping" | "experience";

export function useSubmitAdvisorSuggestion() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      advisorType,
      name,
      destination,
      city,
      neighborhood,
      category,
      reason,
      extraData,
    }: {
      advisorType: AdvisorType;
      name: string;
      destination: string;
      city?: string;
      neighborhood?: string;
      category?: string;
      reason: string;
      extraData?: Record<string, any>;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const { error } = await supabase.from("advisor_suggestions").insert({
        user_id: user.id,
        advisor_type: advisorType,
        name,
        destination,
        city: city || null,
        neighborhood: neighborhood || null,
        category: category || null,
        reason,
        extra_data: extraData || {},
        status: "pending",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-suggestions"] });
    },
  });
}
