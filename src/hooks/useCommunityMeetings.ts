import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export type MeetingType = "online" | "presential" | "hybrid";
export type MeetingStatus = "draft" | "scheduled" | "live" | "completed" | "cancelled";

export interface CommunityMeeting {
  id: string;
  title: string;
  slug: string | null;
  short_description: string | null;
  description: string | null;
  meeting_type: MeetingType;
  status: MeetingStatus;
  cover_image_url: string | null;
  start_at: string;
  end_at: string | null;
  timezone: string | null;
  location_name: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  maps_url: string | null;
  meeting_platform: string | null;
  meeting_url: string | null;
  registration_url: string | null;
  capacity: number | null;
  organizer_name: string | null;
  speakers: any;
  agenda: any;
  recording_url: string | null;
  is_recording_available: boolean;
  photos: any;
  materials: any;
  related_links: any;
  published: boolean;
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export function useCommunityMeetings(enabled = true) {
  const { user } = useAuth();
  const qc = useQueryClient();

  const meetingsQuery = useQuery({
    queryKey: ["community-meetings", "published"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_meetings")
        .select("*")
        .eq("published", true)
        .order("start_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CommunityMeeting[];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });

  const attendanceQuery = useQuery({
    queryKey: ["community-meeting-attendance", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await (supabase as any)
        .from("community_meeting_attendees")
        .select("meeting_id,status")
        .eq("user_id", user.id);
      if (error) throw error;
      return (data ?? []) as { meeting_id: string; status: string }[];
    },
    enabled: enabled && !!user?.id,
    staleTime: 60 * 1000,
  });

  const rsvp = useMutation({
    mutationFn: async ({ meetingId, status }: { meetingId: string; status: "confirmed" | "maybe" | "cancelled" }) => {
      if (!user?.id) throw new Error("Não autenticado");
      const { error } = await (supabase as any)
        .from("community_meeting_attendees")
        .upsert(
          { meeting_id: meetingId, user_id: user.id, status },
          { onConflict: "meeting_id,user_id" }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community-meeting-attendance"] });
      toast.success("Presença atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao confirmar presença"),
  });

  const meetings = meetingsQuery.data ?? [];
  const now = Date.now();
  const upcoming = meetings
    .filter((m) => m.status !== "cancelled" && m.status !== "completed" && new Date(m.start_at).getTime() >= now)
    .sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const past = meetings
    .filter((m) => m.status === "completed" || new Date(m.start_at).getTime() < now)
    .sort((a, b) => new Date(b.start_at).getTime() - new Date(a.start_at).getTime());
  const nextMeeting = upcoming[0] ?? null;

  const attendanceMap = new Map((attendanceQuery.data ?? []).map((a) => [a.meeting_id, a.status]));

  return {
    isLoading: meetingsQuery.isLoading,
    meetings,
    upcoming,
    past,
    nextMeeting,
    attendanceMap,
    rsvp: rsvp.mutate,
    isRsvping: rsvp.isPending,
  };
}

export function buildGoogleCalendarUrl(m: CommunityMeeting): string {
  const start = new Date(m.start_at);
  const end = m.end_at ? new Date(m.end_at) : new Date(start.getTime() + 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: m.title,
    dates: `${fmt(start)}/${fmt(end)}`,
    details: [m.short_description, m.description, m.meeting_url].filter(Boolean).join("\n\n"),
    location: [m.location_name, m.address, m.city, m.state].filter(Boolean).join(", ") || m.meeting_platform || "",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}