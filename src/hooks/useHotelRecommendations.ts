import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

export interface HotelRecommendation {
  id: string;
  user_id: string;
  hotel_id: string | null;
  type: "recommend" | "remove" | "suggest_new";
  reason: string;
  status: "pending" | "approved" | "rejected";
  hotel_data: Record<string, any> | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  // joined
  profile_name?: string;
  agency_name?: string;
}

export function useHotelRecommendations(hotelId?: string) {
  return useQuery({
    queryKey: ["hotel-recommendations", hotelId],
    enabled: !!hotelId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_recommendations")
        .select("*")
        .eq("hotel_id", hotelId!)
        .eq("type", "recommend")
        .eq("status", "approved");
      if (error) throw error;

      // Fetch profile names for each recommendation
      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      let profiles: Record<string, { name: string; agency_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("user_id, name, agency_name")
          .in("user_id", userIds);
        if (profileData) {
          for (const p of profileData) {
            profiles[p.user_id] = { name: p.name, agency_name: p.agency_name };
          }
        }
      }

      return (data || []).map((r: any) => ({
        ...r,
        profile_name: profiles[r.user_id]?.name || "Agente",
        agency_name: profiles[r.user_id]?.agency_name || null,
      })) as HotelRecommendation[];
    },
  });
}

export function useHotelRecommendationCount(hotelId: string) {
  return useQuery({
    queryKey: ["hotel-recommendation-count", hotelId],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("hotel_recommendations")
        .select("id", { count: "exact", head: true })
        .eq("hotel_id", hotelId)
        .eq("type", "recommend")
        .eq("status", "approved");
      if (error) throw error;
      return count || 0;
    },
  });
}

export function useMyRecommendation(hotelId: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["my-hotel-recommendation", hotelId, user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_recommendations")
        .select("id, type, status")
        .eq("hotel_id", hotelId)
        .eq("user_id", user!.id)
        .eq("type", "recommend")
        .in("status", ["pending", "approved"])
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useSubmitRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      hotelId,
      type,
      reason,
      hotelData,
    }: {
      hotelId?: string;
      type: "recommend" | "remove" | "suggest_new";
      reason: string;
      hotelData?: Record<string, any>;
    }) => {
      if (!user) throw new Error("Usuário não autenticado");
      const row: any = {
        user_id: user.id,
        type,
        reason,
        status: "pending",
      };
      if (hotelId) row.hotel_id = hotelId;
      if (hotelData) row.hotel_data = hotelData;

      const { error } = await supabase.from("hotel_recommendations").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hotel-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["hotel-recommendation-count"] });
      queryClient.invalidateQueries({ queryKey: ["my-hotel-recommendation"] });
      queryClient.invalidateQueries({ queryKey: ["admin-hotel-recommendations"] });
    },
  });
}

// Admin: all pending recommendations
export function useAdminHotelRecommendations() {
  return useQuery({
    queryKey: ["admin-hotel-recommendations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hotel_recommendations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const userIds = [...new Set((data || []).map((r: any) => r.user_id))];
      const hotelIds = [...new Set((data || []).map((r: any) => r.hotel_id).filter(Boolean))];

      let profiles: Record<string, { name: string; agency_name: string | null }> = {};
      if (userIds.length > 0) {
        const { data: pData } = await supabase
          .from("profiles")
          .select("user_id, name, agency_name")
          .in("user_id", userIds);
        if (pData) pData.forEach((p) => (profiles[p.user_id] = { name: p.name, agency_name: p.agency_name }));
      }

      let hotels: Record<string, string> = {};
      if (hotelIds.length > 0) {
        const { data: hData } = await supabase
          .from("hotels")
          .select("id, name")
          .in("id", hotelIds as string[]);
        if (hData) hData.forEach((h) => (hotels[h.id] = h.name));
      }

      return (data || []).map((r: any) => ({
        ...r,
        profile_name: profiles[r.user_id]?.name || "Agente",
        agency_name: profiles[r.user_id]?.agency_name || null,
        hotel_name: r.hotel_id ? hotels[r.hotel_id] || "Hotel removido" : null,
      }));
    },
  });
}

export function useApproveRecommendation() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, approve, recommendation }: { id: string; approve: boolean; recommendation?: any }) => {
      if (!user) throw new Error("Not authenticated");

      // Update recommendation status
      const { error } = await supabase
        .from("hotel_recommendations")
        .update({
          status: approve ? "approved" : "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;

      // If approving a suggest_new, create the hotel
      if (approve && recommendation?.type === "suggest_new" && recommendation?.hotel_data) {
        const hd = recommendation.hotel_data;
        const { error: hErr } = await supabase.from("hotels").insert({
          name: hd.name || "Novo Hotel",
          destination: hd.destination || "",
          country: hd.country || "",
          region: hd.region || null,
          neighborhood: hd.neighborhood || null,
          category: hd.category || null,
          star_rating: hd.star_rating || null,
          property_type: hd.property_type || "Hotel",
          is_active: true,
        });
        if (hErr) throw hErr;
      }

      // If approving a removal, deactivate the hotel
      if (approve && recommendation?.type === "remove" && recommendation?.hotel_id) {
        const { error: hErr } = await supabase
          .from("hotels")
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", recommendation.hotel_id);
        if (hErr) throw hErr;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-hotel-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["hotels"] });
      queryClient.invalidateQueries({ queryKey: ["hotel-recommendations"] });
      queryClient.invalidateQueries({ queryKey: ["hotel-recommendation-count"] });
    },
  });
}
