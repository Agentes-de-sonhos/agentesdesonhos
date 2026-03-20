import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ItineraryFormData, Itinerary, ItineraryDay, Activity, AIGeneratedItinerary } from "@/types/itinerary";
import { format, addDays, differenceInDays } from "date-fns";
import { toast } from "sonner";

export function useItineraries() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const mapItinerary = (data: Record<string, unknown>): Itinerary => ({
    id: data.id as string,
    userId: data.user_id as string,
    destination: data.destination as string,
    startDate: data.start_date as string,
    endDate: data.end_date as string,
    travelersCount: data.travelers_count as number,
    tripType: data.trip_type as string,
    budgetLevel: data.budget_level as string,
    status: data.status as Itinerary["status"],
    shareToken: data.share_token as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
  });

  const itinerariesQuery = useQuery({
    queryKey: ["itineraries", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itineraries")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []).map(mapItinerary);
    },
    enabled: !!user,
  });

  const getItineraryWithDetails = async (id: string) => {
    const { data: itinerary, error: itineraryError } = await supabase
      .from("itineraries")
      .select("*")
      .eq("id", id)
      .single();

    if (itineraryError) throw itineraryError;

    const { data: days, error: daysError } = await supabase
      .from("itinerary_days")
      .select("*")
      .eq("itinerary_id", id)
      .order("day_number", { ascending: true });

    if (daysError) throw daysError;

    const daysWithActivities = await Promise.all(
      days.map(async (day) => {
        const { data: activities, error: activitiesError } = await supabase
          .from("itinerary_activities")
          .select("*")
          .eq("day_id", day.id)
          .order("order_index", { ascending: true });

        if (activitiesError) throw activitiesError;

        return {
          id: day.id as string,
          dayNumber: day.day_number as number,
          date: day.date as string,
          activities: (activities || []).map((a) => ({
            id: a.id as string,
            period: a.period as Activity["period"],
            title: a.title as string,
            description: a.description as string | null,
            location: a.location as string | null,
            estimatedDuration: a.estimated_duration as string | null,
            estimatedCost: a.estimated_cost as string | null,
            orderIndex: a.order_index,
            isApproved: a.is_approved,
          })),
        };
      })
    );

    return {
      ...mapItinerary(itinerary),
      days: daysWithActivities,
    };
  };

  const createItinerary = useMutation({
    mutationFn: async (formData: ItineraryFormData) => {
      if (!user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("itineraries")
        .insert({
          user_id: user.id,
          destination: formData.destination,
          start_date: format(formData.startDate, "yyyy-MM-dd"),
          end_date: format(formData.endDate, "yyyy-MM-dd"),
          travelers_count: formData.travelersCount,
          trip_type: formData.tripType,
          budget_level: formData.budgetLevel,
          status: "generating",
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const generateWithAI = async (formData: ItineraryFormData) => {
    const response = await supabase.functions.invoke("generate-itinerary", {
      body: {
        destination: formData.destination,
        startDate: format(formData.startDate, "yyyy-MM-dd"),
        endDate: format(formData.endDate, "yyyy-MM-dd"),
        travelersCount: formData.travelersCount,
        tripType: formData.tripType,
        budgetLevel: formData.budgetLevel,
        interests: formData.interests || [],
        travelPace: formData.travelPace || "moderado",
        additionalPreferences: formData.additionalPreferences || {},
      },
    });

    if (response.error) {
      console.error("Edge function invoke error:", response.error);
      throw new Error(response.error.message || "Erro ao gerar roteiro");
    }

    const data = response.data;
    
    // Check if the response contains an error message from the edge function
    if (data?.error) {
      throw new Error(data.error);
    }

    // Validate the response has the expected structure
    if (!data?.days || !Array.isArray(data.days) || data.days.length === 0) {
      console.error("Invalid AI response structure:", data);
      throw new Error("A IA retornou uma resposta inválida. Tente novamente.");
    }

    return data as AIGeneratedItinerary;
  };

  const saveGeneratedItinerary = async (
    itineraryId: string,
    generatedData: AIGeneratedItinerary,
    startDate: Date
  ) => {
    for (const day of generatedData.days) {
      const dayDate = format(addDays(startDate, day.dayNumber - 1), "yyyy-MM-dd");

      const { data: dayData, error: dayError } = await supabase
        .from("itinerary_days")
        .insert({
          itinerary_id: itineraryId,
          day_number: day.dayNumber,
          date: dayDate,
        })
        .select()
        .single();

      if (dayError) throw dayError;

      const activitiesInsert = day.activities.map((activity, index) => ({
        day_id: dayData.id,
        period: activity.period,
        title: activity.title,
        description: activity.description,
        location: activity.location,
        estimated_duration: activity.estimatedDuration,
        estimated_cost: activity.estimatedCost,
        order_index: index,
        is_approved: false,
      }));

      const { error: activitiesError } = await supabase
        .from("itinerary_activities")
        .insert(activitiesInsert);

      if (activitiesError) throw activitiesError;
    }

    await supabase
      .from("itineraries")
      .update({ status: "review" })
      .eq("id", itineraryId);

    queryClient.invalidateQueries({ queryKey: ["itineraries"] });
  };

  const updateActivity = useMutation({
    mutationFn: async ({
      activityId,
      updates,
    }: {
      activityId: string;
      updates: Partial<{
        title: string;
        description: string;
        location: string;
        estimated_duration: string;
        estimated_cost: string;
        is_approved: boolean;
      }>;
    }) => {
      const { error } = await supabase
        .from("itinerary_activities")
        .update(updates)
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const deleteActivity = useMutation({
    mutationFn: async (activityId: string) => {
      const { error } = await supabase
        .from("itinerary_activities")
        .delete()
        .eq("id", activityId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const addActivity = useMutation({
    mutationFn: async ({
      dayId,
      activity,
    }: {
      dayId: string;
      activity: Omit<Activity, "id" | "orderIndex" | "isApproved">;
    }) => {
      const { error } = await supabase.from("itinerary_activities").insert({
        day_id: dayId,
        period: activity.period,
        title: activity.title,
        description: activity.description,
        location: activity.location,
        estimated_duration: activity.estimatedDuration,
        estimated_cost: activity.estimatedCost,
        order_index: 99,
        is_approved: false,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const updateItineraryStatus = useMutation({
    mutationFn: async ({
      itineraryId,
      status,
      shareToken,
    }: {
      itineraryId: string;
      status: Itinerary["status"];
      shareToken?: string;
    }) => {
      const updates: Record<string, unknown> = { status };
      if (shareToken) updates.share_token = shareToken;

      const { error } = await supabase
        .from("itineraries")
        .update(updates)
        .eq("id", itineraryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  const deleteItinerary = useMutation({
    mutationFn: async (itineraryId: string) => {
      const { error } = await supabase
        .from("itineraries")
        .delete()
        .eq("id", itineraryId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
      toast.success("Roteiro excluído com sucesso");
    },
  });

  return {
    itineraries: itinerariesQuery.data || [],
    isLoading: itinerariesQuery.isLoading,
    getItineraryWithDetails,
    createItinerary,
    generateWithAI,
    saveGeneratedItinerary,
    updateActivity,
    deleteActivity,
    addActivity,
    updateItineraryStatus,
    deleteItinerary,
  };
}
