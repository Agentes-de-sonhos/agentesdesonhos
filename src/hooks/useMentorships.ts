import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type {
  Mentorship,
  MentorshipMeeting,
  MentorshipVideo,
  MentorshipModule,
  MentorshipLesson,
  MentorshipMaterial,
} from "@/types/mentorship";

export function useMentorships() {
  const queryClient = useQueryClient();

  // Fetch all mentorships
  const { data: mentorships = [], isLoading: loadingMentorships } = useQuery({
    queryKey: ["mentorships"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mentorships")
        .select("*")
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as Mentorship[];
    },
  });

  // Create mentorship
  const createMentorship = useMutation({
    mutationFn: async (mentorship: Omit<Mentorship, "id" | "created_at" | "updated_at">) => {
      const { data, error } = await supabase
        .from("mentorships")
        .insert(mentorship)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      toast.success("Mentoria criada com sucesso!");
    },
    onError: (error) => {
      console.error("Error creating mentorship:", error);
      toast.error("Erro ao criar mentoria");
    },
  });

  // Update mentorship
  const updateMentorship = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Mentorship> & { id: string }) => {
      const { data, error } = await supabase
        .from("mentorships")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      toast.success("Mentoria atualizada com sucesso!");
    },
    onError: (error) => {
      console.error("Error updating mentorship:", error);
      toast.error("Erro ao atualizar mentoria");
    },
  });

  // Delete mentorship
  const deleteMentorship = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorships").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorships"] });
      toast.success("Mentoria removida com sucesso!");
    },
    onError: (error) => {
      console.error("Error deleting mentorship:", error);
      toast.error("Erro ao remover mentoria");
    },
  });

  return {
    mentorships,
    loadingMentorships,
    createMentorship,
    updateMentorship,
    deleteMentorship,
  };
}

export function useMentorshipDetail(mentorshipId: string | undefined) {
  const queryClient = useQueryClient();

  // Fetch mentorship details
  const { data: mentorship, isLoading: loadingMentorship } = useQuery({
    queryKey: ["mentorship", mentorshipId],
    queryFn: async () => {
      if (!mentorshipId) return null;
      const { data, error } = await supabase
        .from("mentorships")
        .select("*")
        .eq("id", mentorshipId)
        .single();
      if (error) throw error;
      return data as Mentorship;
    },
    enabled: !!mentorshipId,
  });

  // Fetch meetings
  const { data: meetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["mentorship-meetings", mentorshipId],
    queryFn: async () => {
      if (!mentorshipId) return [];
      const { data, error } = await supabase
        .from("mentorship_meetings")
        .select("*")
        .eq("mentorship_id", mentorshipId)
        .order("meeting_date", { ascending: true });
      if (error) throw error;
      return data as MentorshipMeeting[];
    },
    enabled: !!mentorshipId,
  });

  // Fetch videos
  const { data: videos = [], isLoading: loadingVideos } = useQuery({
    queryKey: ["mentorship-videos", mentorshipId],
    queryFn: async () => {
      if (!mentorshipId) return [];
      const { data, error } = await supabase
        .from("mentorship_videos")
        .select("*")
        .eq("mentorship_id", mentorshipId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as MentorshipVideo[];
    },
    enabled: !!mentorshipId,
  });

  // Fetch modules with lessons
  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ["mentorship-modules", mentorshipId],
    queryFn: async () => {
      if (!mentorshipId) return [];
      const { data, error } = await supabase
        .from("mentorship_modules")
        .select("*")
        .eq("mentorship_id", mentorshipId)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as MentorshipModule[];
    },
    enabled: !!mentorshipId,
  });

  // Fetch lessons for all modules
  const { data: lessons = [], isLoading: loadingLessons } = useQuery({
    queryKey: ["mentorship-lessons", mentorshipId],
    queryFn: async () => {
      if (!mentorshipId || modules.length === 0) return [];
      const moduleIds = modules.map((m) => m.id);
      const { data, error } = await supabase
        .from("mentorship_lessons")
        .select("*")
        .in("module_id", moduleIds)
        .order("order_index", { ascending: true });
      if (error) throw error;
      return data as MentorshipLesson[];
    },
    enabled: !!mentorshipId && modules.length > 0,
  });

  // Fetch materials
  const { data: materials = [], isLoading: loadingMaterials } = useQuery({
    queryKey: ["mentorship-materials", mentorshipId],
    queryFn: async () => {
      if (!mentorshipId) return [];
      const { data, error } = await supabase
        .from("mentorship_materials")
        .select("*")
        .eq("mentorship_id", mentorshipId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as MentorshipMaterial[];
    },
    enabled: !!mentorshipId,
  });

  // CRUD for meetings
  const createMeeting = useMutation({
    mutationFn: async (meeting: {
      mentorship_id: string;
      title: string;
      description?: string;
      meeting_date: string;
      meeting_url?: string;
      recording_url?: string;
      is_past?: boolean;
    }) => {
      const { data, error } = await supabase
        .from("mentorship_meetings")
        .insert(meeting)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-meetings", mentorshipId] });
      toast.success("Encontro adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar encontro"),
  });

  const updateMeeting = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<MentorshipMeeting> & { id: string }) => {
      const { data, error } = await supabase
        .from("mentorship_meetings")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-meetings", mentorshipId] });
      toast.success("Encontro atualizado!");
    },
    onError: () => toast.error("Erro ao atualizar encontro"),
  });

  const deleteMeeting = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorship_meetings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-meetings", mentorshipId] });
      toast.success("Encontro removido!");
    },
    onError: () => toast.error("Erro ao remover encontro"),
  });

  // CRUD for videos
  const createVideo = useMutation({
    mutationFn: async (video: {
      mentorship_id: string;
      title: string;
      description?: string;
      video_url: string;
      thumbnail_url?: string;
      duration_minutes?: number;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from("mentorship_videos")
        .insert(video)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-videos", mentorshipId] });
      toast.success("Vídeo adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar vídeo"),
  });

  const deleteVideo = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorship_videos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-videos", mentorshipId] });
      toast.success("Vídeo removido!");
    },
    onError: () => toast.error("Erro ao remover vídeo"),
  });

  // CRUD for modules
  const createModule = useMutation({
    mutationFn: async (module: {
      mentorship_id: string;
      title: string;
      description?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from("mentorship_modules")
        .insert(module)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-modules", mentorshipId] });
      toast.success("Módulo adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar módulo"),
  });

  const deleteModule = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorship_modules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-modules", mentorshipId] });
      toast.success("Módulo removido!");
    },
    onError: () => toast.error("Erro ao remover módulo"),
  });

  // CRUD for lessons
  const createLesson = useMutation({
    mutationFn: async (lesson: {
      module_id: string;
      title: string;
      description?: string;
      video_url?: string;
      order_index?: number;
    }) => {
      const { data, error } = await supabase
        .from("mentorship_lessons")
        .insert(lesson)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-lessons", mentorshipId] });
      toast.success("Aula adicionada!");
    },
    onError: () => toast.error("Erro ao adicionar aula"),
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorship_lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-lessons", mentorshipId] });
      toast.success("Aula removida!");
    },
    onError: () => toast.error("Erro ao remover aula"),
  });

  // CRUD for materials
  const createMaterial = useMutation({
    mutationFn: async (material: {
      mentorship_id: string;
      title: string;
      description?: string;
      file_url: string;
      file_type?: string;
    }) => {
      const { data, error } = await supabase
        .from("mentorship_materials")
        .insert(material)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-materials", mentorshipId] });
      toast.success("Material adicionado!");
    },
    onError: () => toast.error("Erro ao adicionar material"),
  });

  const deleteMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("mentorship_materials").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["mentorship-materials", mentorshipId] });
      toast.success("Material removido!");
    },
    onError: () => toast.error("Erro ao remover material"),
  });

  return {
    mentorship,
    loadingMentorship,
    meetings,
    loadingMeetings,
    videos,
    loadingVideos,
    modules,
    loadingModules,
    lessons,
    loadingLessons,
    materials,
    loadingMaterials,
    createMeeting,
    updateMeeting,
    deleteMeeting,
    createVideo,
    deleteVideo,
    createModule,
    deleteModule,
    createLesson,
    deleteLesson,
    createMaterial,
    deleteMaterial,
  };
}
