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
    publicAccessCode: (data as any).public_access_code as string | null,
    createdAt: data.created_at as string,
    updatedAt: data.updated_at as string,
    coverImageUrl: (data as any).cover_image_url ?? null,
    destinationIntroText: (data as any).destination_intro_text ?? null,
    destinationIntroImages: (data as any).destination_intro_images ?? [],
    showDestinationIntro: (data as any).show_destination_intro ?? true,
    passengers: ((data as any).passengers ?? []).map((p: any) => ({
      name: p?.name ?? "",
      age: p?.age ?? null,
    })),
    passengerInterests: Array.from(
      new Set(
        (((data as any).passengers ?? []) as any[]).flatMap((p: any) =>
          Array.isArray(p?.interests) ? p.interests : []
        )
      )
    ),
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
            photoUrl: (a as any).photo_url ?? null,
            documentUrls: (a as any).document_urls ?? [],
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
          client_id: formData.clientId || null,
          passengers: (formData.passengers ?? []) as any,
        } as any)
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
        origin: formData.origin,
        destination: formData.destination,
        startDate: format(formData.startDate, "yyyy-MM-dd"),
        endDate: format(formData.endDate, "yyyy-MM-dd"),
        travelersCount: formData.travelersCount,
        adultsCount: formData.adultsCount,
        childrenCount: formData.childrenCount,
        tripType: formData.tripType,
        budgetLevel: formData.budgetLevel,
        interests: formData.interests || [],
        travelPace: formData.travelPace || "moderado",
        additionalPreferences: formData.additionalPreferences || {},
        passengers: formData.passengers,
        arrivalInfo: formData.arrivalInfo
          ? { transport: formData.arrivalInfo.transport, period: formData.arrivalInfo.period }
          : undefined,
        departureInfo: formData.departureInfo
          ? { transport: formData.departureInfo.transport, period: formData.departureInfo.period }
          : undefined,
        extraDestinations: formData.extraDestinations,
      },
    });

    if (response.error) {
      console.error("Edge function invoke error:", response.error);
      // Try to extract the real error message from the response body
      let errorMessage = "Erro ao gerar roteiro. Tente novamente.";
      try {
        const ctx = (response.error as any)?.context;
        if (ctx && typeof ctx.json === "function") {
          const body = await ctx.json();
          if (body?.error) errorMessage = body.error;
        } else if (response.data?.error) {
          errorMessage = response.data.error;
        }
      } catch {
        // fallback to generic message
      }
      throw new Error(errorMessage);
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

      const { data: insertedActivities, error: activitiesError } = await supabase
        .from("itinerary_activities")
        .insert(activitiesInsert)
        .select("id, title, location");

      if (activitiesError) throw activitiesError;

      // Best-effort: auto-pick a representative photo per activity so the
      // public link and PDF already render with imagery without requiring
      // the agent to open each activity in the editor first.
      (async () => {
        try {
          const { data: itinForPhoto } = await supabase
            .from("itineraries")
            .select("destination")
            .eq("id", itineraryId)
            .maybeSingle();
          const destination = (itinForPhoto as any)?.destination as string | undefined;
          await Promise.all(
            (insertedActivities || []).map(async (a: any) => {
              try {
                const { data: photo } = await supabase.functions.invoke(
                  "activity-photo",
                  {
                    body: {
                      query: a.title,
                      location: a.location ?? undefined,
                      destination,
                    },
                  }
                );
                const url: string | null =
                  photo?.photo_url ?? photo?.thumb_url ?? null;
                if (url) {
                  await supabase
                    .from("itinerary_activities")
                    .update({ photo_url: url })
                    .eq("id", a.id);
                }
              } catch (err) {
                console.warn("[itinerary] activity photo prefetch failed", err);
              }
            })
          );
          queryClient.invalidateQueries({ queryKey: ["itineraries"] });
        } catch (err) {
          console.warn("[itinerary] activity photo batch failed", err);
        }
      })();
    }

    // Best-effort: auto-generate destination intro (text + photo gallery)
    // for the public itinerary page. Failures are non-blocking.
    try {
      const { data: itin } = await supabase
        .from("itineraries")
        .select("destination")
        .eq("id", itineraryId)
        .single();
      const destination = (itin as any)?.destination as string | undefined;
      const updates: Record<string, unknown> = { status: "review" };

      if (destination) {
        // 1) Intro text via AI
        try {
          const { data: introData } = await supabase.functions.invoke(
            "generate-destination-intro",
            { body: { destination } }
          );
          if (introData?.text) updates.destination_intro_text = introData.text;
        } catch (e) {
          console.warn("[itinerary] intro text generation failed", e);
        }

        // 2) Photos from Google Places (same flow as quote intro)
        try {
          const cities = destination.split(",").map((s) => s.trim()).filter(Boolean);
          const MAX_PHOTOS = 5;
          const perCity = Math.max(1, Math.floor(MAX_PHOTOS / cities.length));
          const collected: string[] = [];
          for (const city of cities) {
            if (collected.length >= MAX_PHOTOS) break;
            const { data: placeData } = await supabase.functions.invoke(
              "places-autocomplete",
              { body: { input: city, place_type: "city" } }
            );
            const firstId = placeData?.predictions?.[0]?.place_id;
            if (!firstId) continue;
            const { data: detailsData } = await supabase.functions.invoke(
              "places-autocomplete",
              { body: { fetch_details: true, place_id: firstId, place_type: "city" } }
            );
            const urls: string[] = detailsData?.details?.photo_urls || [];
            if (urls.length > 0) collected.push(...urls.slice(0, perCity));
          }
          const photos = collected.slice(0, MAX_PHOTOS);
          if (photos.length > 0) {
            updates.destination_intro_images = photos;
            updates.cover_image_url = photos[0];
          }
        } catch (e) {
          console.warn("[itinerary] intro photo fetch failed", e);
        }
      }

      await supabase
        .from("itineraries")
        .update(updates as any)
        .eq("id", itineraryId);
    } catch (e) {
      console.warn("[itinerary] post-generation enrichment failed", e);
      await supabase
        .from("itineraries")
        .update({ status: "review" })
        .eq("id", itineraryId);
    }

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
        photo_url: string | null;
        document_urls: string[];
        period: "manha" | "tarde" | "noite";
        day_id: string;
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

  const moveActivity = useMutation({
    mutationFn: async ({
      activityId,
      dayId,
      period,
    }: {
      activityId: string;
      dayId: string;
      period: "manha" | "tarde" | "noite";
    }) => {
      const { error } = await supabase
        .from("itinerary_activities")
        .update({ day_id: dayId, period, order_index: 99 })
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

  const updateItineraryDetails = useMutation({
    mutationFn: async ({
      itineraryId,
      updates,
    }: {
      itineraryId: string;
      updates: Partial<{
        destination: string;
        travelers_count: number;
        trip_type: string;
        budget_level: string;
        destination_intro_text: string | null;
        destination_intro_images: string[];
        cover_image_url: string | null;
        show_destination_intro: boolean;
      }>;
    }) => {
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
    moveActivity,
    updateItineraryStatus,
    updateItineraryDetails,
    deleteItinerary,
  };
}
