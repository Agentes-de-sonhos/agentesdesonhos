import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { useUserRole } from "./useUserRole";
import { 
  PromoterPresentation, 
  PromoterPresentationUsage, 
  StartPresentationData,
  TrackableFeature 
} from "@/types/promoter-presentation";
import { toast } from "sonner";

export function usePromoterPresentation() {
  const { user } = useAuth();
  const { role } = useUserRole();
  const queryClient = useQueryClient();
  const isPromotor = role === "promotor";

  // Fetch active presentation for current promoter
  const { data: activePresentation, isLoading: loadingPresentation } = useQuery({
    queryKey: ["active-presentation", user?.id],
    queryFn: async () => {
      if (!user || !isPromotor) return null;
      
      const { data, error } = await supabase
        .from("promoter_presentations")
        .select("*")
        .eq("promoter_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      return data as PromoterPresentation | null;
    },
    enabled: !!user && isPromotor,
  });

  // Fetch usage for active presentation
  const { data: usageData } = useQuery({
    queryKey: ["presentation-usage", activePresentation?.id],
    queryFn: async () => {
      if (!activePresentation) return [];
      
      const { data, error } = await supabase
        .from("promoter_presentation_usage")
        .select("*")
        .eq("presentation_id", activePresentation.id);

      if (error) throw error;
      return data as PromoterPresentationUsage[];
    },
    enabled: !!activePresentation,
  });

  // Start a new presentation
  const startPresentationMutation = useMutation({
    mutationFn: async (data: StartPresentationData) => {
      if (!user) throw new Error("Usuário não autenticado");

      // First, end any existing active presentations
      await supabase
        .from("promoter_presentations")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("promoter_id", user.id)
        .eq("is_active", true);

      // Create new presentation
      const { data: newPresentation, error } = await supabase
        .from("promoter_presentations")
        .insert({
          promoter_id: user.id,
          ...data,
        })
        .select()
        .single();

      if (error) throw error;
      return newPresentation;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-presentation"] });
      toast.success("Apresentação iniciada com sucesso!");
    },
    onError: (error) => {
      toast.error("Erro ao iniciar apresentação: " + error.message);
    },
  });

  // End current presentation
  const endPresentationMutation = useMutation({
    mutationFn: async () => {
      if (!activePresentation) throw new Error("Nenhuma apresentação ativa");

      const { error } = await supabase
        .from("promoter_presentations")
        .update({ is_active: false, ended_at: new Date().toISOString() })
        .eq("id", activePresentation.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-presentation"] });
      toast.success("Apresentação encerrada!");
    },
    onError: (error) => {
      toast.error("Erro ao encerrar apresentação: " + error.message);
    },
  });

  // Track feature usage
  const trackFeatureUsage = useMutation({
    mutationFn: async (featureName: TrackableFeature) => {
      if (!activePresentation) throw new Error("Nenhuma apresentação ativa");

      const { error } = await supabase
        .from("promoter_presentation_usage")
        .insert({
          presentation_id: activePresentation.id,
          feature_name: featureName,
        });

      if (error) {
        if (error.code === "23505") {
          // Unique constraint violation - feature already used
          throw new Error("Funcionalidade já utilizada nesta apresentação");
        }
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["presentation-usage"] });
    },
  });

  // Check if a feature can be used
  const canUseFeature = useCallback((featureName: TrackableFeature): boolean => {
    if (!isPromotor) return true; // Non-promoters have normal access
    if (!activePresentation) return false; // Promoters need active presentation
    if (!usageData) return true; // Still loading, assume yes
    
    return !usageData.some(u => u.feature_name === featureName);
  }, [isPromotor, activePresentation, usageData]);

  // Get list of used features
  const getUsedFeatures = useCallback((): string[] => {
    return usageData?.map(u => u.feature_name) || [];
  }, [usageData]);

  return {
    isPromotor,
    activePresentation,
    loadingPresentation,
    usageData,
    startPresentation: startPresentationMutation.mutate,
    isStartingPresentation: startPresentationMutation.isPending,
    endPresentation: endPresentationMutation.mutate,
    isEndingPresentation: endPresentationMutation.isPending,
    trackFeatureUsage: trackFeatureUsage.mutate,
    canUseFeature,
    getUsedFeatures,
    needsPresentation: isPromotor && !activePresentation && !loadingPresentation,
  };
}
