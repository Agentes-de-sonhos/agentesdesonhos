import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type {
  MarketplaceCourse,
  MarketplaceModule,
  MarketplaceLesson,
  MarketplaceMeeting,
  MarketplaceEnrollment,
  MarketplaceLessonProgress,
  MarketplaceComment,
} from "@/types/marketplace";

export function useMarketplaceCourses() {
  const { user } = useAuth();

  // Fetch approved courses (catalog)
  const { data: courses = [], isLoading } = useQuery({
    queryKey: ["marketplace-courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("marketplace_courses")
        .select("*")
        .eq("status", "approved")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      // Fetch creator profiles
      const creatorIds = [...new Set((data || []).map((c: any) => c.creator_id))];
      let profiles: any[] = [];
      if (creatorIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", creatorIds);
        profiles = pData || [];
      }
      return (data || []).map((c: any) => {
        const p = profiles.find((p: any) => p.user_id === c.creator_id);
        return { ...c, creator_name: p?.name, creator_avatar: p?.avatar_url } as MarketplaceCourse;
      });
    },
  });

  // Fetch user's own courses (creator view)
  const { data: myCourses = [], isLoading: loadingMyCourses } = useQuery({
    queryKey: ["marketplace-my-courses", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("marketplace_courses")
        .select("*")
        .eq("creator_id", user.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as MarketplaceCourse[];
    },
    enabled: !!user,
  });

  // Fetch user's enrollments
  const { data: enrollments = [], isLoading: loadingEnrollments } = useQuery({
    queryKey: ["marketplace-enrollments", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("marketplace_enrollments")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data || []) as MarketplaceEnrollment[];
    },
    enabled: !!user,
  });

  const isEnrolled = (courseId: string) => enrollments.some((e) => e.course_id === courseId);

  return { courses, isLoading, myCourses, loadingMyCourses, enrollments, loadingEnrollments, isEnrolled };
}

export function useMarketplaceCourseDetail(courseId: string | undefined) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: course, isLoading: loadingCourse } = useQuery({
    queryKey: ["marketplace-course", courseId],
    queryFn: async () => {
      if (!courseId) return null;
      const { data, error } = await supabase
        .from("marketplace_courses")
        .select("*")
        .eq("id", courseId)
        .single();
      if (error) throw error;
      // Get creator profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .eq("user_id", data.creator_id)
        .single();
      return {
        ...data,
        creator_name: profile?.name,
        creator_avatar: profile?.avatar_url,
      } as MarketplaceCourse;
    },
    enabled: !!courseId,
  });

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ["marketplace-modules", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("marketplace_modules")
        .select("*")
        .eq("course_id", courseId)
        .order("order_index");
      if (error) throw error;
      // Fetch lessons for each module
      const moduleIds = (data || []).map((m: any) => m.id);
      let lessons: any[] = [];
      if (moduleIds.length > 0) {
        const { data: lData } = await supabase
          .from("marketplace_lessons")
          .select("*")
          .in("module_id", moduleIds)
          .order("order_index");
        lessons = lData || [];
      }
      return (data || []).map((m: any) => ({
        ...m,
        lessons: lessons.filter((l: any) => l.module_id === m.id),
      })) as MarketplaceModule[];
    },
    enabled: !!courseId,
  });

  const { data: meetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["marketplace-meetings", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("marketplace_meetings")
        .select("*")
        .eq("course_id", courseId)
        .order("meeting_date");
      if (error) throw error;
      return (data || []) as MarketplaceMeeting[];
    },
    enabled: !!courseId,
  });

  const { data: enrollment } = useQuery({
    queryKey: ["marketplace-enrollment", courseId, user?.id],
    queryFn: async () => {
      if (!courseId || !user) return null;
      const { data } = await supabase
        .from("marketplace_enrollments")
        .select("*")
        .eq("course_id", courseId)
        .eq("user_id", user.id)
        .maybeSingle();
      return data as MarketplaceEnrollment | null;
    },
    enabled: !!courseId && !!user,
  });

  const { data: progress = [] } = useQuery({
    queryKey: ["marketplace-progress", enrollment?.id],
    queryFn: async () => {
      if (!enrollment) return [];
      const { data } = await supabase
        .from("marketplace_lesson_progress")
        .select("*")
        .eq("enrollment_id", enrollment.id);
      return (data || []) as MarketplaceLessonProgress[];
    },
    enabled: !!enrollment,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ["marketplace-comments", courseId],
    queryFn: async () => {
      if (!courseId) return [];
      const { data, error } = await supabase
        .from("marketplace_comments")
        .select("*")
        .eq("course_id", courseId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const userIds = [...new Set((data || []).map((c: any) => c.user_id))];
      let profiles: any[] = [];
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, name, avatar_url")
          .in("user_id", userIds);
        profiles = pData || [];
      }
      return (data || []).map((c: any) => {
        const p = profiles.find((p: any) => p.user_id === c.user_id);
        return { ...c, user_name: p?.name, user_avatar: p?.avatar_url } as MarketplaceComment;
      });
    },
    enabled: !!courseId,
  });

  // Mutations
  const createModule = useMutation({
    mutationFn: async (mod: { course_id: string; title: string; description?: string; order_index?: number }) => {
      const { data, error } = await supabase.from("marketplace_modules").insert(mod).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-modules", courseId] });
      toast.success("Módulo criado!");
    },
    onError: () => toast.error("Erro ao criar módulo"),
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-modules", courseId] });
      toast.success("Módulo removido!");
    },
    onError: () => toast.error("Erro ao remover módulo"),
  });

  const createLesson = useMutation({
    mutationFn: async (lesson: {
      module_id: string;
      title: string;
      description?: string;
      video_url?: string;
      duration_minutes?: number;
      material_url?: string;
      material_name?: string;
      order_index?: number;
      is_preview?: boolean;
    }) => {
      const { data, error } = await supabase.from("marketplace_lessons").insert(lesson).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-modules", courseId] });
      toast.success("Aula adicionada!");
    },
    onError: () => toast.error("Erro ao criar aula"),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-modules", courseId] });
      toast.success("Aula removida!");
    },
    onError: () => toast.error("Erro ao remover aula"),
  });

  const createMeeting = useMutation({
    mutationFn: async (meeting: {
      course_id: string;
      title: string;
      description?: string;
      meeting_date: string;
      meeting_url?: string;
    }) => {
      const { data, error } = await supabase.from("marketplace_meetings").insert(meeting).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-meetings", courseId] });
      toast.success("Encontro adicionado!");
    },
    onError: () => toast.error("Erro ao criar encontro"),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-meetings", courseId] });
      toast.success("Encontro removido!");
    },
    onError: () => toast.error("Erro ao remover encontro"),
  });

  const markLessonComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      if (!enrollment) throw new Error("Não matriculado");
      const { error } = await supabase.from("marketplace_lesson_progress").insert({
        enrollment_id: enrollment.id,
        lesson_id: lessonId,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-progress", enrollment?.id] });
      toast.success("Aula concluída!");
    },
    onError: () => toast.error("Erro ao marcar progresso"),
  });

  const addComment = useMutation({
    mutationFn: async (data: { course_id: string; lesson_id?: string; content: string }) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("marketplace_comments").insert({
        ...data,
        user_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-comments", courseId] });
      toast.success("Comentário adicionado!");
    },
    onError: () => toast.error("Erro ao comentar"),
  });

  const isLessonCompleted = (lessonId: string) => progress.some((p) => p.lesson_id === lessonId);

  const totalLessons = modules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);
  const completedLessons = progress.length;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

  return {
    course,
    loadingCourse,
    modules,
    loadingModules,
    meetings,
    loadingMeetings,
    enrollment,
    progress,
    comments,
    createModule,
    deleteModule,
    createLesson,
    deleteLesson,
    createMeeting,
    deleteMeeting,
    markLessonComplete,
    addComment,
    isLessonCompleted,
    totalLessons,
    completedLessons,
    progressPercent,
  };
}

export function useMarketplaceCourseMutations() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const createCourse = useMutation({
    mutationFn: async (course: {
      title: string;
      description?: string;
      cover_image_url?: string;
      product_type: string;
      price: number;
      category: string;
      level: string;
    }) => {
      if (!user) throw new Error("Não autenticado");
      const { data, error } = await supabase
        .from("marketplace_courses")
        .insert({ ...course, creator_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as MarketplaceCourse;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-courses"] });
      toast.success("Curso criado!");
    },
    onError: () => toast.error("Erro ao criar curso"),
  });

  const updateCourse = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MarketplaceCourse> & { id: string }) => {
      const { data, error } = await supabase
        .from("marketplace_courses")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-courses"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-course"] });
      toast.success("Curso atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar curso"),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("marketplace_courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-courses"] });
      toast.success("Curso removido!");
    },
    onError: () => toast.error("Erro ao remover curso"),
  });

  const submitForReview = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("marketplace_courses")
        .update({ status: "pending_review" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-my-courses"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-course"] });
      toast.success("Curso enviado para aprovação!");
    },
    onError: () => toast.error("Erro ao enviar para aprovação"),
  });

  const enrollFree = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error("Não autenticado");
      const { error } = await supabase.from("marketplace_enrollments").insert({
        course_id: courseId,
        user_id: user.id,
        amount_paid: 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-enrollments"] });
      queryClient.invalidateQueries({ queryKey: ["marketplace-enrollment"] });
      toast.success("Matrícula realizada!");
    },
    onError: () => toast.error("Erro na matrícula"),
  });

  return { createCourse, updateCourse, deleteCourse, submitForReview, enrollFree };
}
