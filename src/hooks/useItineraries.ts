import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { ItineraryFormData, Itinerary, ItineraryDay, Activity, AIGeneratedItinerary } from "@/types/itinerary";
import { format, addDays, differenceInDays } from "date-fns";
import { toast } from "sonner";
import { parseLocalDate } from "@/lib/dateParsing";

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
    headline: (data as any).headline ?? null,
    showPricingSection: (data as any).show_pricing_section ?? false,
    pricingContent: (data as any).pricing_content ?? null,
    clientId: ((data as any).client_id ?? null) as string | null,
    clientName:
      ((data as any).clients?.name ?? (data as any).client?.name ?? null) as
        | string
        | null,
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
      const rows = data || [];
      const clientIds = Array.from(
        new Set(
          rows
            .map((r: any) => r.client_id)
            .filter((v: unknown): v is string => typeof v === "string" && !!v),
        ),
      );
      let clientMap = new Map<string, string>();
      if (clientIds.length) {
        const { data: clients } = await supabase
          .from("clients")
          .select("id, name")
          .in("id", clientIds);
        clientMap = new Map(
          (clients ?? []).map((c: any) => [c.id as string, c.name as string]),
        );
      }
      return rows.map((r: any) =>
        mapItinerary({
          ...r,
          clients: r.client_id ? { name: clientMap.get(r.client_id) ?? null } : null,
        }),
      );
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
            mapsUrl: (a as any).maps_url ?? null,
            linkedTripServiceId: (a as any).linked_trip_service_id ?? null,
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
        linked_trip_service_id: string | null;
        maps_url: string | null;
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

  const reorderActivities = useMutation({
    mutationFn: async (
      updates: { id: string; orderIndex: number }[]
    ) => {
      for (const u of updates) {
        const { error } = await supabase
          .from("itinerary_activities")
          .update({ order_index: u.orderIndex })
          .eq("id", u.id);
        if (error) throw error;
      }
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
        headline: string | null;
        start_date: string;
        end_date: string;
        show_pricing_section: boolean;
        pricing_content: string | null;
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

  const adjustItineraryDates = useMutation({
    mutationFn: async ({
      itineraryId,
      startDate,
      endDate,
    }: {
      itineraryId: string;
      startDate: Date;
      endDate: Date;
    }) => {
      const startStr = format(startDate, "yyyy-MM-dd");
      const endStr = format(endDate, "yyyy-MM-dd");
      const newDayCount = differenceInDays(endDate, startDate) + 1;
      if (newDayCount < 1) throw new Error("A data final precisa ser igual ou posterior à inicial.");

      // Update itinerary dates
      const { error: updErr } = await supabase
        .from("itineraries")
        .update({ start_date: startStr, end_date: endStr })
        .eq("id", itineraryId);
      if (updErr) throw updErr;

      // Load existing days
      const { data: existingDays, error: daysErr } = await supabase
        .from("itinerary_days")
        .select("id, day_number, date")
        .eq("itinerary_id", itineraryId)
        .order("day_number", { ascending: true });
      if (daysErr) throw daysErr;

      const existing = existingDays || [];

      // Shift dates for kept days (up to newDayCount)
      const keptCount = Math.min(existing.length, newDayCount);
      for (let i = 0; i < keptCount; i++) {
        const newDate = format(addDays(startDate, i), "yyyy-MM-dd");
        const day = existing[i];
        if (day.date !== newDate || day.day_number !== i + 1) {
          const { error } = await supabase
            .from("itinerary_days")
            .update({ date: newDate, day_number: i + 1 })
            .eq("id", day.id);
          if (error) throw error;
        }
      }

      // Remove extra days (cascade deletes activities)
      if (existing.length > newDayCount) {
        const toDelete = existing.slice(newDayCount).map((d) => d.id);
        const { error } = await supabase
          .from("itinerary_days")
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }

      // Add new empty days if needed
      if (existing.length < newDayCount) {
        const toInsert = [];
        for (let i = existing.length; i < newDayCount; i++) {
          toInsert.push({
            itinerary_id: itineraryId,
            day_number: i + 1,
            date: format(addDays(startDate, i), "yyyy-MM-dd"),
          });
        }
        const { error } = await supabase.from("itinerary_days").insert(toInsert);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  /**
   * Apply an add/delete plan atomically-ish: reprice existing days to
   * temporary negative day_numbers, drop removed days, then commit the
   * final `day_number` and `date` for each kept day and insert any new
   * empty days. Finally updates the itinerary's start/end dates. This
   * mirrors the two-phase strategy used by `reorderDays` to avoid
   * colliding with the `(itinerary_id, day_number)` unique index.
   */
  const mutateItineraryDays = useMutation({
    mutationFn: async ({
      itineraryId,
      sequence,
      newStartDate,
      newEndDate,
    }: {
      itineraryId: string;
      sequence: Array<{ dayId?: string }>;
      newStartDate: string;
      newEndDate: string;
    }) => {
      if (sequence.length < 1) {
        throw new Error("O roteiro precisa possuir pelo menos um dia.");
      }

      const { data: existing, error: exErr } = await supabase
        .from("itinerary_days")
        .select("id, day_number")
        .eq("itinerary_id", itineraryId);
      if (exErr) throw exErr;

      const keptIds = new Set(
        sequence.filter((s) => s.dayId).map((s) => s.dayId as string),
      );
      const toDelete = (existing || []).filter((d) => !keptIds.has(d.id as string));

      // Phase 1 — negative day_numbers on kept rows.
      for (let i = 0; i < sequence.length; i++) {
        const slot = sequence[i];
        if (!slot.dayId) continue;
        const { error } = await supabase
          .from("itinerary_days")
          .update({ day_number: -(i + 1) })
          .eq("id", slot.dayId);
        if (error) throw error;
      }

      // Phase 2 — delete removed days (cascade removes activities + period images).
      if (toDelete.length > 0) {
        const { error } = await supabase
          .from("itinerary_days")
          .delete()
          .in("id", toDelete.map((d) => d.id as string));
        if (error) throw error;
      }

      // Phase 3 — commit final day_number/date for kept + insert new empties.
      const start = parseLocalDate(newStartDate);
      for (let i = 0; i < sequence.length; i++) {
        const slot = sequence[i];
        const date = format(addDays(start, i), "yyyy-MM-dd");
        if (slot.dayId) {
          const { error } = await supabase
            .from("itinerary_days")
            .update({ day_number: i + 1, date })
            .eq("id", slot.dayId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("itinerary_days")
            .insert({
              itinerary_id: itineraryId,
              day_number: i + 1,
              date,
            });
          if (error) throw error;
        }
      }

      // Phase 4 — sync itinerary start/end dates.
      const { error: itErr } = await supabase
        .from("itineraries")
        .update({ start_date: newStartDate, end_date: newEndDate })
        .eq("id", itineraryId);
      if (itErr) throw itErr;
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

  const reorderDays = useMutation({
    mutationFn: async ({
      itineraryId,
      orderedDayIds,
    }: {
      itineraryId: string;
      orderedDayIds: string[];
    }) => {
      // Load itinerary start date so we can rebuild each day's date from its
      // new chronological position.
      const { data: itinerary, error: itErr } = await supabase
        .from("itineraries")
        .select("start_date")
        .eq("id", itineraryId)
        .single();
      if (itErr) throw itErr;
      const startDate = parseLocalDate(itinerary.start_date as string);

      // Two-phase update to avoid violating the unique (itinerary_id, day_number)
      // constraint while positions are swapped.
      for (let i = 0; i < orderedDayIds.length; i++) {
        const { error } = await supabase
          .from("itinerary_days")
          .update({ day_number: -(i + 1) })
          .eq("id", orderedDayIds[i]);
        if (error) throw error;
      }
      for (let i = 0; i < orderedDayIds.length; i++) {
        const newDate = format(addDays(startDate, i), "yyyy-MM-dd");
        const { error } = await supabase
          .from("itinerary_days")
          .update({ day_number: i + 1, date: newDate })
          .eq("id", orderedDayIds[i]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
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
    reorderActivities,
    updateItineraryStatus,
    updateItineraryDetails,
    adjustItineraryDates,
    reorderDays,
    deleteItinerary,
  };
}
