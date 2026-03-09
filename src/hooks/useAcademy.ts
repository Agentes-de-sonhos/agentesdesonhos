import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useGamification } from "@/hooks/useGamification";
import { generateCertificatePdf } from "@/lib/generateCertificatePdf";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type {
  LearningTrail,
  Training,
  TrailTraining,
  UserTrainingProgress,
  UserCertificate,
  TrailWithProgress,
  RankingUser,
  QuizQuestion,
  QuizOption,
  UserQuizAttempt,
  TrailExamQuestion,
  TrailExamOption,
  UserExamAttempt,
  TrailMaterial,
  TrailSpeaker,
  UserAchievement,
  AchievementDefinition,
} from "@/types/academy";

export function useAcademy() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { awardCertificatePoints } = useGamification();

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

  // Quiz attempts for user
  const { data: quizAttempts = [] } = useQuery({
    queryKey: ["user-quiz-attempts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_quiz_attempts")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserQuizAttempt[];
    },
    enabled: !!user,
  });

  // Exam attempts for user
  const { data: examAttempts = [] } = useQuery({
    queryKey: ["user-exam-attempts", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_exam_attempts")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as UserExamAttempt[];
    },
    enabled: !!user,
  });

  // User achievements
  const { data: userAchievements = [] } = useQuery({
    queryKey: ["user-achievements", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("user_achievements")
        .select("*, achievement:achievement_definitions(*)")
        .eq("user_id", user.id);
      if (error) throw error;
      return data as (UserAchievement & { achievement: AchievementDefinition })[];
    },
    enabled: !!user,
  });

  // Has user passed quiz for a training?
  const hasPassedQuiz = (trainingId: string) => {
    return quizAttempts.some((a) => a.training_id === trainingId && a.passed);
  };

  // Has user passed exam for a trail?
  const hasPassedExam = (trailId: string) => {
    return examAttempts.some((a) => a.trail_id === trailId && a.passed);
  };

  // Best exam score for a trail
  const bestExamScore = (trailId: string) => {
    const attempts = examAttempts.filter((a) => a.trail_id === trailId);
    return attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : 0;
  };

  // Compute trails with progress (quiz-based)
  const trailsWithProgress: TrailWithProgress[] = trails.map((trail) => {
    const trailTrainingsList = trailTrainings.filter((tt) => tt.trail_id === trail.id);
    const totalCount = trailTrainingsList.length;
    const completedCount = trailTrainingsList.filter((tt) =>
      hasPassedQuiz(tt.training_id)
    ).length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const allQuizzesPassed = totalCount > 0 && completedCount === totalCount;
    const examPassed = hasPassedExam(trail.id);
    const hasCert = certificates.some((c) => c.trail_id === trail.id);

    return {
      ...trail,
      trainings: trailTrainingsList,
      completedCount,
      totalCount,
      progressPercent,
      allQuizzesPassed,
      examPassed,
      hasCertificate: hasCert,
    };
  });

  // Submit quiz attempt
  const submitQuiz = useMutation({
    mutationFn: async ({ trainingId, answers, score, passed }: { trainingId: string; answers: Record<string, string>; score: number; passed: boolean }) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase.from("user_quiz_attempts").insert({
        user_id: user.id,
        training_id: trainingId,
        answers: answers as any,
        score,
        passed,
      });
      if (error) throw error;

      // Also mark training progress
      if (passed) {
        const { data: existing } = await supabase
          .from("user_training_progress")
          .select("id")
          .eq("user_id", user.id)
          .eq("training_id", trainingId)
          .maybeSingle();
        if (existing) {
          await supabase.from("user_training_progress").update({
            is_completed: true,
            completed_at: new Date().toISOString(),
          }).eq("id", existing.id);
        } else {
          await supabase.from("user_training_progress").insert({
            user_id: user.id,
            training_id: trainingId,
            is_completed: true,
            completed_at: new Date().toISOString(),
            watched_minutes: 0,
          });
        }
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-quiz-attempts"] });
      queryClient.invalidateQueries({ queryKey: ["user-training-progress"] });
      if (variables.passed) {
        toast({ title: "Quiz aprovado! ✅", description: `Nota: ${variables.score}%` });
      } else {
        toast({ title: "Quiz não aprovado", description: `Nota: ${variables.score}%. Você precisa de 100% para avançar.`, variant: "destructive" });
      }
    },
  });

  // Submit exam attempt
  const submitExam = useMutation({
    mutationFn: async ({ trailId, answers, score, passed }: { trailId: string; answers: Record<string, string>; score: number; passed: boolean }) => {
      if (!user) throw new Error("User not authenticated");
      const { error } = await supabase.from("user_exam_attempts").insert({
        user_id: user.id,
        trail_id: trailId,
        answers: answers as any,
        score,
        passed,
      });
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["user-exam-attempts"] });
      if (variables.passed) {
        toast({ title: "Prova final aprovada! 🎉", description: `Nota: ${variables.score}%` });
      } else {
        toast({ title: "Prova não aprovada", description: `Nota: ${variables.score}%. Mínimo: 75%.`, variant: "destructive" });
      }
    },
  });

  const generateCertificate = useMutation({
    mutationFn: async ({ trailId, agentName }: { trailId: string; agentName: string }) => {
      if (!user) throw new Error("User not authenticated");

      // Get the trail to check for template
      const trail = trails.find((t) => t.id === trailId);
      if (!trail) throw new Error("Trilha não encontrada");

      // Generate certificate number via DB function
      const { data: certNumData, error: certNumError } = await supabase.rpc("generate_certificate_number");
      if (certNumError) throw certNumError;
      const certificateNumber = certNumData as string;

      const completionDate = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

      let pdfUrl: string | null = null;

      // Generate PDF if template exists
      if (trail.certificate_template_url) {
        const pdfBlob = await generateCertificatePdf({
          templateUrl: trail.certificate_template_url,
          agentName,
          completionDate,
          certificateNumber,
        });

        // Upload PDF to storage
        const sanitizedName = agentName
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9]/g, "_");
        const path = `certificates/${user.id}/${certificateNumber}_${sanitizedName}.pdf`;
        const { error: uploadError } = await supabase.storage
          .from("academy-files")
          .upload(path, pdfBlob, { contentType: "application/pdf" });
        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("academy-files")
          .getPublicUrl(path);
        pdfUrl = urlData.publicUrl;

        // Auto-download
        const downloadUrl = URL.createObjectURL(pdfBlob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = `Certificado_${certificateNumber}.pdf`;
        a.click();
        URL.revokeObjectURL(downloadUrl);
      }

      const { error } = await supabase.from("user_certificates").insert({
        user_id: user.id,
        trail_id: trailId,
        agent_name: agentName,
        certificate_number: certificateNumber,
        certificate_pdf_url: pdfUrl,
      } as any);
      if (error) throw error;
      return { certificateNumber, trailId, pdfUrl };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["user-certificates"] });
      toast({ title: "Certificado gerado com sucesso! 🏆" });
      awardCertificatePoints(result.trailId);
    },
  });

  const hasCertificate = (trailId: string) => certificates.some((c) => c.trail_id === trailId);
  const isTrailCompleted = (trailId: string) => {
    const trail = trailsWithProgress.find((t) => t.id === trailId);
    return trail ? trail.allQuizzesPassed && trail.examPassed : false;
  };

  return {
    trails,
    trainings,
    trailTrainings,
    trailsWithProgress,
    userProgress,
    certificates,
    quizAttempts,
    examAttempts,
    userAchievements,
    isLoading: trailsLoading || trainingsLoading,
    hasPassedQuiz,
    hasPassedExam,
    bestExamScore,
    submitQuiz,
    submitExam,
    generateCertificate,
    isTrailCompleted,
    hasCertificate,
  };
}

// Hook for quiz questions
export function useQuizQuestions(trainingId: string | null) {
  return useQuery({
    queryKey: ["quiz-questions", trainingId],
    queryFn: async () => {
      if (!trainingId) return [];
      const { data: questions, error } = await supabase
        .from("quiz_questions")
        .select("*")
        .eq("training_id", trainingId)
        .order("order_index", { ascending: true });
      if (error) throw error;

      // Fetch options for each question
      const questionIds = questions.map((q: any) => q.id);
      if (questionIds.length === 0) return [];

      const { data: options, error: optError } = await supabase
        .from("quiz_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_index", { ascending: true });
      if (optError) throw optError;

      return questions.map((q: any) => ({
        ...q,
        options: (options || []).filter((o: any) => o.question_id === q.id),
      })) as QuizQuestion[];
    },
    enabled: !!trainingId,
  });
}

// Hook for exam questions
export function useExamQuestions(trailId: string | null) {
  return useQuery({
    queryKey: ["exam-questions", trailId],
    queryFn: async () => {
      if (!trailId) return [];
      const { data: questions, error } = await supabase
        .from("trail_exam_questions")
        .select("*")
        .eq("trail_id", trailId)
        .order("order_index", { ascending: true });
      if (error) throw error;

      const questionIds = questions.map((q: any) => q.id);
      if (questionIds.length === 0) return [];

      const { data: options, error: optError } = await supabase
        .from("trail_exam_options")
        .select("*")
        .in("question_id", questionIds)
        .order("order_index", { ascending: true });
      if (optError) throw optError;

      return questions.map((q: any) => ({
        ...q,
        options: (options || []).filter((o: any) => o.question_id === q.id),
      })) as TrailExamQuestion[];
    },
    enabled: !!trailId,
  });
}

// Hook for trail materials
export function useTrailMaterials(trailId: string | null) {
  return useQuery({
    queryKey: ["trail-materials", trailId],
    queryFn: async () => {
      if (!trailId) return [];
      const { data, error } = await supabase
        .from("trail_materials")
        .select("*")
        .eq("trail_id", trailId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as TrailMaterial[];
    },
    enabled: !!trailId,
  });
}

// Hook for trail speakers
export function useTrailSpeakers(trailId: string | null) {
  return useQuery({
    queryKey: ["trail-speakers", trailId],
    queryFn: async () => {
      if (!trailId) return [];
      const { data, error } = await supabase
        .from("trail_speakers")
        .select("*")
        .eq("trail_id", trailId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as TrailSpeaker[];
    },
    enabled: !!trailId,
  });
}

export function useAcademyRanking() {
  const { data: ranking = [], isLoading } = useQuery({
    queryKey: ["academy-ranking"],
    queryFn: async () => {
      const { data: certData, error: certError } = await supabase
        .from("user_certificates")
        .select("user_id");
      if (certError) throw certError;

      const { data: examData, error: examError } = await supabase
        .from("user_exam_attempts")
        .select("user_id, score, passed")
        .eq("passed", true);
      if (examError) throw examError;

      const userIds = [...new Set([...certData.map((c: any) => c.user_id), ...examData.map((e: any) => e.user_id)])];
      if (userIds.length === 0) return [];

      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name")
        .in("user_id", userIds);
      if (profilesError) throw profilesError;

      const rankingMap = new Map<string, RankingUser>();
      userIds.forEach((userId) => {
        const profile = profiles.find((p: any) => p.user_id === userId);
        const userCerts = certData.filter((c: any) => c.user_id === userId);
        const userExams = examData.filter((e: any) => e.user_id === userId);
        const avgScore = userExams.length > 0
          ? Math.round(userExams.reduce((sum: number, e: any) => sum + e.score, 0) / userExams.length)
          : 0;

        rankingMap.set(userId, {
          user_id: userId,
          name: profile?.name || "Usuário",
          avatar_url: profile?.avatar_url || null,
          agency_name: profile?.agency_name || null,
          trails_completed: userCerts.length,
          total_score: userCerts.length * 100 + avgScore,
          avg_exam_score: avgScore,
        });
      });

      return Array.from(rankingMap.values()).sort((a, b) => {
        if (b.trails_completed !== a.trails_completed) return b.trails_completed - a.trails_completed;
        if (b.avg_exam_score !== a.avg_exam_score) return b.avg_exam_score - a.avg_exam_score;
        return b.total_score - a.total_score;
      });
    },
  });

  return { ranking, isLoading };
}

export function useAcademyAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createTrail = useMutation({
    mutationFn: async (trail: Partial<LearningTrail>) => {
      const { error } = await supabase.from("learning_trails").insert(trail as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-trails"] });
      toast({ title: "Trilha criada com sucesso!" });
    },
  });

  const updateTrail = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<LearningTrail> & { id: string }) => {
      const { error } = await supabase.from("learning_trails").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-trails"] });
      toast({ title: "Trilha atualizada!" });
    },
  });

  const deleteTrail = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("learning_trails").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["learning-trails"] });
      toast({ title: "Trilha excluída!" });
    },
  });

  const createTraining = useMutation({
    mutationFn: async (training: Partial<Training>) => {
      const { error } = await supabase.from("trainings").insert(training as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast({ title: "Treinamento criado!" });
    },
  });

  const updateTraining = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Training> & { id: string }) => {
      const { error } = await supabase.from("trainings").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast({ title: "Treinamento atualizado!" });
    },
  });

  const deleteTraining = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trainings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trainings"] });
      toast({ title: "Treinamento excluído!" });
    },
  });

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
  });

  const unlinkTrainingFromTrail = useMutation({
    mutationFn: async ({ trailId, trainingId }: { trailId: string; trainingId: string }) => {
      const { error } = await supabase.from("trail_trainings").delete().eq("trail_id", trailId).eq("training_id", trainingId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-trainings"] });
      toast({ title: "Treinamento removido da trilha!" });
    },
  });

  // Quiz management
  const saveQuizQuestion = useMutation({
    mutationFn: async ({ trainingId, question, options }: { trainingId: string; question: Partial<QuizQuestion>; options: Partial<QuizOption>[] }) => {
      const { data: q, error: qErr } = await supabase
        .from("quiz_questions")
        .insert({ ...question, training_id: trainingId } as any)
        .select()
        .single();
      if (qErr) throw qErr;

      if (options.length > 0) {
        const { error: oErr } = await supabase
          .from("quiz_options")
          .insert(options.map((o) => ({ ...o, question_id: q.id })) as any);
        if (oErr) throw oErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      toast({ title: "Pergunta adicionada!" });
    },
  });

  const deleteQuizQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase.from("quiz_questions").delete().eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      toast({ title: "Pergunta removida!" });
    },
  });

  // Exam management
  const saveExamQuestion = useMutation({
    mutationFn: async ({ trailId, question, options }: { trailId: string; question: Partial<TrailExamQuestion>; options: Partial<TrailExamOption>[] }) => {
      const { data: q, error: qErr } = await supabase
        .from("trail_exam_questions")
        .insert({ ...question, trail_id: trailId } as any)
        .select()
        .single();
      if (qErr) throw qErr;

      if (options.length > 0) {
        const { error: oErr } = await supabase
          .from("trail_exam_options")
          .insert(options.map((o) => ({ ...o, question_id: q.id })) as any);
        if (oErr) throw oErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-questions"] });
      toast({ title: "Pergunta da prova adicionada!" });
    },
  });

  const deleteExamQuestion = useMutation({
    mutationFn: async (questionId: string) => {
      const { error } = await supabase.from("trail_exam_questions").delete().eq("id", questionId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["exam-questions"] });
      toast({ title: "Pergunta da prova removida!" });
    },
  });

  // Trail materials management
  const saveTrailMaterial = useMutation({
    mutationFn: async (material: Partial<TrailMaterial>) => {
      const { error } = await supabase.from("trail_materials").insert(material as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-materials"] });
      toast({ title: "Material adicionado!" });
    },
  });

  const updateTrailMaterial = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; order_index?: number; thumbnail_url?: string }) => {
      const { error } = await supabase.from("trail_materials").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-materials"] });
    },
  });

  const reorderTrailMaterials = useMutation({
    mutationFn: async (items: { id: string; order_index: number }[]) => {
      for (const item of items) {
        const { error } = await supabase.from("trail_materials").update({ order_index: item.order_index } as any).eq("id", item.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-materials"] });
    },
  });

  const deleteTrailMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trail_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-materials"] });
      toast({ title: "Material removido!" });
    },
  });

  // Trail speakers management
  const saveTrailSpeaker = useMutation({
    mutationFn: async (speaker: Partial<TrailSpeaker>) => {
      const { error } = await supabase.from("trail_speakers").insert(speaker as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-speakers"] });
      toast({ title: "Palestrante adicionado!" });
    },
  });

  const updateTrailSpeaker = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<TrailSpeaker> & { id: string }) => {
      const { error } = await supabase.from("trail_speakers").update(updates as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-speakers"] });
      toast({ title: "Palestrante atualizado!" });
    },
  });

  const deleteTrailSpeaker = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("trail_speakers").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trail-speakers"] });
      toast({ title: "Palestrante removido!" });
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
    saveQuizQuestion,
    deleteQuizQuestion,
    saveExamQuestion,
    deleteExamQuestion,
    saveTrailMaterial,
    updateTrailMaterial,
    reorderTrailMaterials,
    deleteTrailMaterial,
    saveTrailSpeaker,
    updateTrailSpeaker,
    deleteTrailSpeaker,
  };
}
