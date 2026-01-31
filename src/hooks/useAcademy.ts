import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import type {
  LearningTrail,
  Training,
  TrailTraining,
  UserTrainingProgress,
  UserCertificate,
  TrailWithProgress,
  RankingUser,
} from "@/types/academy";

export function useAcademy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all trails
  const { data: trails = [], isLoading: trailsLoading } = useQuery({
    queryKey: ["learning-trails"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("learning_trails")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as LearningTrail[];
    },
  });

  // Fetch all trainings
  const { data: trainings = [], isLoading: trainingsLoading } = useQuery({
    queryKey: ["trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trainings")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Training[];
    },
  });

  // Fetch trail-training relationships
  const { data: trailTrainings = [] } = useQuery({
    queryKey: ["trail-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("trail_trainings")
        .select("*, training:trainings(*)")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as (TrailTraining & { training: Training })[];
    },
  });

  // Fetch user progress
  const { data: userProgress = [] } = useQuery({
    queryKey: ["user-training-progress", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_training_progress")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserTrainingProgress[];
    },
    enabled: !!user,
  });

  // Fetch user certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ["user-certificates", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_certificates")
        .select("*, trail:learning_trails(*)")
        .eq("user_id", user.id)
        .order("issued_at", { ascending: false });
      if (error) throw error;
      return data as (UserCertificate & { trail: LearningTrail })[];
    },
    enabled: !!user,
  });

  // Compute trails with progress
  const trailsWithProgress: TrailWithProgress[] = trails.map((trail) => {
    const trailTrainingsList = trailTrainings.filter((tt) => tt.trail_id === trail.id);
    const totalCount = trailTrainingsList.length;
    const completedCount = trailTrainingsList.filter((tt) =>
      userProgress.some((p) => p.training_id === tt.training_id && p.is_completed)
    ).length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return {
      ...trail,
      trainings: trailTrainingsList,
      completedCount,
      totalCount,
      progressPercent,
    };
  });

  // Mark training as completed
  const markTrainingComplete = useMutation({
    mutationFn: async ({ trainingId, watchedMinutes }: { trainingId: string; watchedMinutes?: number }) => {
      if (!user) throw new Error("User not authenticated");

      const { data: existing } = await supabase
        .from("user_training_progress")
        .select("id")
        .eq("user_id", user.id)
        .eq("training_id", trainingId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from("user_training_progress")
          .update({
            is_completed: true,
            completed_at: new Date().toISOString(),
            watched_minutes: watchedMinutes || 0,
          })
          .eq("id", existing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("user_training_progress").insert({
          user_id: user.id,
          training_id: trainingId,
          is_completed: true,
          completed_at: new Date().toISOString(),
          watched_minutes: watchedMinutes || 0,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-training-progress"] });
      toast({ title: "Treinamento concluído!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao marcar conclusão", description: error.message, variant: "destructive" });
    },
  });

  // Generate certificate for completed trail
  const generateCertificate = useMutation({
    mutationFn: async ({ trailId, agentName }: { trailId: string; agentName: string }) => {
      if (!user) throw new Error("User not authenticated");

      const certificateNumber = `CERT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;

      const { error } = await supabase.from("user_certificates").insert({
        user_id: user.id,
        trail_id: trailId,
        agent_name: agentName,
        certificate_number: certificateNumber,
      });
      if (error) throw error;
      return certificateNumber;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-certificates"] });
      toast({ title: "Certificado gerado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao gerar certificado", description: error.message, variant: "destructive" });
    },
  });

  // Check if trail is completed
  const isTrailCompleted = (trailId: string) => {
    const trail = trailsWithProgress.find((t) => t.id === trailId);
    return trail ? trail.progressPercent === 100 : false;
  };

  // Check if certificate exists for trail
  const hasCertificate = (trailId: string) => {
    return certificates.some((c) => c.trail_id === trailId);
  };

  return {
    trails,
    trainings,
    trailTrainings,
    trailsWithProgress,
    userProgress,
    certificates,
    isLoading: trailsLoading || trainingsLoading,
    markTrainingComplete,
    generateCertificate,
    isTrailCompleted,
    hasCertificate,
  };
}

export function useAcademyRanking() {
  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ["academy-ranking"],
    queryFn: async () => {
      // Fetch all progress with profiles
      const { data: progressData, error: progressError } = await supabase
        .from("user_training_progress")
        .select("user_id, is_completed, watched_minutes");
      if (progressError) throw progressError;

      // Fetch all certificates
      const { data: certData, error: certError } = await supabase
        .from("user_certificates")
        .select("user_id");
      if (certError) throw certError;

      // Fetch profiles
      const userIds = [...new Set([...progressData.map((p) => p.user_id), ...certData.map((c) => c.user_id)])];
      
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      // Build ranking
      const rankingMap = new Map<string, RankingUser>();

      userIds.forEach((userId) => {
        const profile = profiles.find((p) => p.user_id === userId);
        const userProgress = progressData.filter((p) => p.user_id === userId);
        const userCerts = certData.filter((c) => c.user_id === userId);

        rankingMap.set(userId, {
          user_id: userId,
          name: profile?.name || "Usuário",
          avatar_url: profile?.avatar_url || null,
          trails_completed: userCerts.length,
          total_watched_minutes: userProgress.reduce((sum, p) => sum + (p.watched_minutes || 0), 0),
        });
      });

      // Sort by trails completed, then by watched minutes
      return Array.from(rankingMap.values()).sort((a, b) => {
        if (b.trails_completed !== a.trails_completed) {
          return b.trails_completed - a.trails_completed;
        }
        return b.total_watched_minutes - a.total_watched_minutes;
      });
    },
  });

  return { ranking, isLoading };
}

export function useAcademyAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Create trail
  const createTrail = useMutation({
    mutationFn: async (trail: Partial<LearningTrail>) => {
      const { error } = await supabase.from("learning_trails").insert(trail as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-trails"] });
      toast({ title: "Trilha criada com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar trilha", description: error.message, variant: "destructive" });
    },
  });

  // Update trail
  const updateTrail = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LearningTrail> & { id: string }) => {
      const { error } = await supabase.from("learning_trails").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-trails"] });
      toast({ title: "Trilha atualizada!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar trilha", description: error.message, variant: "destructive" });
    },
  });

  // Delete trail
  const deleteTrail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_trails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-trails"] });
      toast({ title: "Trilha excluída!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir trilha", description: error.message, variant: "destructive" });
    },
  });

  // Create training
  const createTraining = useMutation({
    mutationFn: async (training: Partial<Training>) => {
      const { error } = await supabase.from("trainings").insert(training as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast({ title: "Treinamento criado com sucesso!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao criar treinamento", description: error.message, variant: "destructive" });
    },
  });

  // Update training
  const updateTraining = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Training> & { id: string }) => {
      const { error } = await supabase.from("trainings").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast({ title: "Treinamento atualizado!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao atualizar treinamento", description: error.message, variant: "destructive" });
    },
  });

  // Delete training
  const deleteTraining = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast({ title: "Treinamento excluído!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao excluir treinamento", description: error.message, variant: "destructive" });
    },
  });

  // Link training to trail
  const linkTrainingToTrail = useMutation({
    mutationFn: async ({ trailId, trainingId, orderIndex = 0 }: { trailId: string; trainingId: string; orderIndex?: number }) => {
      const { error } = await supabase.from("trail_trainings").insert({
        trail_id: trailId,
        training_id: trainingId,
        order_index: orderIndex,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-trainings"] });
      toast({ title: "Treinamento vinculado à trilha!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao vincular treinamento", description: error.message, variant: "destructive" });
    },
  });

  // Unlink training from trail
  const unlinkTrainingFromTrail = useMutation({
    mutationFn: async ({ trailId, trainingId }: { trailId: string; trainingId: string }) => {
      const { error } = await supabase
        .from("trail_trainings")
        .delete()
        .eq("trail_id", trailId)
        .eq("training_id", trainingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-trainings"] });
      toast({ title: "Treinamento removido da trilha!" });
    },
    onError: (error) => {
      toast({ title: "Erro ao remover treinamento", description: error.message, variant: "destructive" });
    },
  });

  return {
    createTrail,
    updateTrail,
    deleteTrail,
    createTraining,
    updateTraining,
    deleteTraining,
    linkTrainingToTrail,
    unlinkTrainingFromTrail,
  };
}
