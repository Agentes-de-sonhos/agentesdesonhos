import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import type {
  FunTrip,
  OnlineMeeting,
  InPersonEvent,
  ProfessionalWorkshop,
  PaidTraining,
  CommunityHighlight,
  WhatsAppCommunity,
  MonthlyPrize,
  WorkshopCategory,
} from "@/types/community";

export function useCommunity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Fun Trips
  const { data: funTrips = [], isLoading: loadingFunTrips } = useQuery({
    queryKey: ["fun-trips"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("fun_trips")
        .select("*")
        .order("trip_date", { ascending: true });
      if (error) throw error;
      return data as FunTrip[];
    },
  });

  // Online Meetings
  const { data: onlineMeetings = [], isLoading: loadingMeetings } = useQuery({
    queryKey: ["online-meetings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("online_meetings")
        .select("*")
        .order("meeting_datetime", { ascending: true });
      if (error) throw error;
      return data as OnlineMeeting[];
    },
  });

  const upcomingMeetings = onlineMeetings.filter((m) => !m.is_past);
  const pastMeetings = onlineMeetings.filter((m) => m.is_past);

  // In-Person Events
  const { data: inPersonEvents = [], isLoading: loadingEvents } = useQuery({
    queryKey: ["in-person-events"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("in_person_events")
        .select("*")
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as InPersonEvent[];
    },
  });

  // Professional Workshops
  const { data: workshops = [], isLoading: loadingWorkshops } = useQuery({
    queryKey: ["professional-workshops"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("professional_workshops")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as ProfessionalWorkshop[];
    },
  });

  const getWorkshopsByCategory = (category: WorkshopCategory) =>
    workshops.filter((w) => w.category === category);

  // Paid Trainings
  const { data: paidTrainings = [], isLoading: loadingTrainings } = useQuery({
    queryKey: ["paid-trainings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paid_trainings")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as PaidTraining[];
    },
  });

  // WhatsApp Community
  const { data: whatsappCommunity, isLoading: loadingWhatsapp } = useQuery({
    queryKey: ["whatsapp-community"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("whatsapp_community")
        .select("*")
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as WhatsAppCommunity | null;
    },
  });

  // Current Month/Year for highlights
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  // Community Highlights
  const { data: highlights = [], isLoading: loadingHighlights } = useQuery({
    queryKey: ["community-highlights", currentMonth, currentYear],
    queryFn: async () => {
      // Fetch highlights
      const { data: highlightsData, error } = await supabase
        .from("community_highlights")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .order("vote_count", { ascending: false });
      
      if (error) throw error;
      
      // Fetch profiles for each highlight
      const userIds = highlightsData.map(h => h.user_id);
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url")
        .in("user_id", userIds);
      
      // Map profiles to highlights
      return highlightsData.map(highlight => ({
        ...highlight,
        profile: profilesData?.find(p => p.user_id === highlight.user_id) || undefined,
      })) as CommunityHighlight[];
    },
  });

  // Monthly Prize
  const { data: currentPrize, isLoading: loadingPrize } = useQuery({
    queryKey: ["monthly-prize", currentMonth, currentYear],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("monthly_prizes")
        .select("*")
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .single();
      if (error && error.code !== "PGRST116") throw error;
      return data as MonthlyPrize | null;
    },
  });

  // Check if user has voted this month
  const { data: hasVoted = false } = useQuery({
    queryKey: ["has-voted", user?.id, currentMonth, currentYear],
    queryFn: async () => {
      if (!user?.id) return false;
      const { data, error } = await supabase
        .from("community_votes")
        .select("id")
        .eq("voter_id", user.id)
        .eq("month", currentMonth)
        .eq("year", currentYear)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
    enabled: !!user?.id,
  });

  // Vote mutation
  const voteMutation = useMutation({
    mutationFn: async (highlightId: string) => {
      if (!user?.id) throw new Error("Usuário não autenticado");
      if (hasVoted) throw new Error("Você já votou este mês");

      const { error } = await supabase.from("community_votes").insert({
        voter_id: user.id,
        highlight_id: highlightId,
        month: currentMonth,
        year: currentYear,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Voto registrado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["community-highlights"] });
      queryClient.invalidateQueries({ queryKey: ["has-voted"] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const isLoading =
    loadingFunTrips ||
    loadingMeetings ||
    loadingEvents ||
    loadingWorkshops ||
    loadingTrainings ||
    loadingWhatsapp ||
    loadingHighlights ||
    loadingPrize;

  return {
    funTrips,
    upcomingMeetings,
    pastMeetings,
    inPersonEvents,
    workshops,
    getWorkshopsByCategory,
    paidTrainings,
    whatsappCommunity,
    highlights,
    currentPrize,
    hasVoted,
    vote: voteMutation.mutate,
    isVoting: voteMutation.isPending,
    currentMonth,
    currentYear,
    isLoading,
  };
}
