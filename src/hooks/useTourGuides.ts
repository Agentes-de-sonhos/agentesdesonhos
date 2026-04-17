import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface GuideLanguage {
  code: string;
  level: string;
}

export interface TourGuide {
  id: string;
  user_id: string | null;
  full_name: string;
  professional_name: string | null;
  photo_url: string | null;
  city: string | null;
  country: string | null;
  regions: string[] | null;
  languages: GuideLanguage[];
  specialties: string[] | null;
  services: string[] | null;
  bio: string | null;
  differentials: string | null;
  certifications: string[] | null;
  gallery_urls: string[] | null;
  whatsapp: string;
  email: string | null;
  instagram: string | null;
  website: string | null;
  status: string;
  is_verified: boolean;
  plan_type: string;
}

export function useApprovedTourGuides() {
  return useQuery({
    queryKey: ["tour-guides-approved"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tour_guides")
        .select("*")
        .eq("status", "approved")
        .order("is_verified", { ascending: false })
        .order("full_name");
      if (error) throw error;
      return (data || []) as unknown as TourGuide[];
    },
  });
}

export function useOwnTourGuide(userId: string | undefined) {
  return useQuery({
    queryKey: ["tour-guide-own", userId],
    queryFn: async () => {
      if (!userId) return null;
      const { data, error } = await supabase
        .from("tour_guides")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as TourGuide | null;
    },
    enabled: !!userId,
  });
}
