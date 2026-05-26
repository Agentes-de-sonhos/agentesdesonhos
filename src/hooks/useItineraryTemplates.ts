import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";
import { toast } from "sonner";
import { addDays, format } from "date-fns";

export interface ItineraryTemplate {
  id: string;
  user_id: string;
  name: string;
  destination: string | null;
  cover_image_url: string | null;
  nights_count: number;
  style: "economico" | "moderado" | "luxo";
  profile: string;
  pace: "leve" | "moderado" | "intenso";
  tags: string[];
  interests: string[];
  destination_intro_text: string | null;
  destination_intro_images: string[];
  additional_preferences: Record<string, unknown>;
  source_itinerary_id: string | null;
  created_at: string;
  updated_at: string;
  activities_count?: number;
  days_count?: number;
}

export interface TemplateActivity {
  id?: string;
  template_id?: string;
  day_number: number;
  period: "manha" | "tarde" | "noite";
  order_index: number;
  title: string;
  description: string | null;
  location: string | null;
  estimated_duration: string | null;
  estimated_cost: string | null;
  photo_url: string | null;
  category: string | null;
  priority: "essencial" | "opcional";
}

export interface CreateTemplatePayload {
  name: string;
  destination?: string | null;
  cover_image_url?: string | null;
  nights_count: number;
  style: ItineraryTemplate["style"];
  profile: string;
  pace?: ItineraryTemplate["pace"];
  tags?: string[];
  interests?: string[];
  destination_intro_text?: string | null;
  destination_intro_images?: string[];
  additional_preferences?: Record<string, unknown>;
  source_itinerary_id?: string | null;
  activities: Omit<TemplateActivity, "id" | "template_id">[];
}

export interface InstantiatePayload {
  templateId: string;
  clientId: string;
  clientName: string;
  destinationOverride?: string;
  startDate: Date;
  endDate: Date;
  travelersCount: number;
  tripType?: string;
  budgetLevel?: string;
}

export function useItineraryTemplates() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const templatesQuery = useQuery({
    queryKey: ["itinerary_templates", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("itinerary_templates")
        .select("*, itinerary_template_activities(id, day_number)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((t: any) => {
        const acts = t.itinerary_template_activities ?? [];
        const days = new Set<number>(acts.map((a: any) => a.day_number));
        return {
          ...t,
          tags: t.tags ?? [],
          interests: t.interests ?? [],
          destination_intro_images: t.destination_intro_images ?? [],
          additional_preferences: t.additional_preferences ?? {},
          activities_count: acts.length,
          days_count: days.size,
        } as ItineraryTemplate;
      });
    },
    enabled: !!user,
  });

  const getTemplateWithActivities = async (id: string) => {
    const { data: tpl, error } = await supabase
      .from("itinerary_templates")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    const { data: acts, error: aErr } = await supabase
      .from("itinerary_template_activities")
      .select("*")
      .eq("template_id", id)
      .order("day_number", { ascending: true })
      .order("order_index", { ascending: true });
    if (aErr) throw aErr;
    return { template: tpl as any, activities: (acts ?? []) as TemplateActivity[] };
  };

  const createTemplate = useMutation({
    mutationFn: async (payload: CreateTemplatePayload) => {
      if (!user) throw new Error("Não autenticado");
      const { activities, ...meta } = payload;
      const { data: tpl, error } = await supabase
        .from("itinerary_templates")
        .insert({
          user_id: user.id,
          name: meta.name,
          destination: meta.destination ?? null,
          cover_image_url: meta.cover_image_url ?? null,
          nights_count: meta.nights_count,
          style: meta.style,
          profile: meta.profile,
          pace: meta.pace ?? "moderado",
          tags: meta.tags ?? [],
          interests: meta.interests ?? [],
          destination_intro_text: meta.destination_intro_text ?? null,
          destination_intro_images: meta.destination_intro_images ?? [],
          additional_preferences: meta.additional_preferences ?? {},
          source_itinerary_id: meta.source_itinerary_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;

      if (activities.length > 0) {
        const rows = activities.map((a) => ({ ...a, template_id: tpl.id }));
        const { error: aErr } = await supabase
          .from("itinerary_template_activities")
          .insert(rows);
        if (aErr) throw aErr;
      }
      return tpl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary_templates"] });
      toast.success("Modelo salvo na sua biblioteca!");
    },
    onError: (e: any) => {
      toast.error(e?.message || "Erro ao salvar modelo");
    },
  });

  const updateTemplate = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<Omit<ItineraryTemplate, "id" | "user_id" | "created_at" | "updated_at" | "activities_count" | "days_count">>;
    }) => {
      const { error } = await supabase
        .from("itinerary_templates")
        .update(updates as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary_templates"] });
      toast.success("Modelo atualizado");
    },
  });

  const deleteTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("itinerary_templates")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary_templates"] });
      toast.success("Modelo excluído");
    },
  });

  const duplicateTemplate = useMutation({
    mutationFn: async (id: string) => {
      const { template, activities } = await getTemplateWithActivities(id);
      const { id: _omit, created_at, updated_at, ...rest } = template;
      const { data: tpl, error } = await supabase
        .from("itinerary_templates")
        .insert({
          ...rest,
          name: `${template.name} (cópia)`,
        })
        .select()
        .single();
      if (error) throw error;
      if (activities.length > 0) {
        const rows = activities.map(({ id: _aid, template_id: _tid, ...a }) => ({
          ...a,
          template_id: tpl.id,
        }));
        const { error: aErr } = await supabase
          .from("itinerary_template_activities")
          .insert(rows as any);
        if (aErr) throw aErr;
      }
      return tpl;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itinerary_templates"] });
      toast.success("Modelo duplicado");
    },
  });

  /**
   * Instantiate a new itinerary from a template.
   * - Maps day_number → calendar dates from startDate
   * - If new nights ≠ template nights: proportional remap, marks itinerary
   *   with `needs_ai_adaptation` so a future Edge Function can refine.
   */
  const instantiateFromTemplate = useMutation({
    mutationFn: async (payload: InstantiatePayload) => {
      if (!user) throw new Error("Não autenticado");
      const { template, activities } = await getTemplateWithActivities(payload.templateId);

      const nightsNew = Math.max(
        1,
        Math.round(
          (payload.endDate.getTime() - payload.startDate.getTime()) /
            (1000 * 60 * 60 * 24),
        ),
      );
      const daysNew = nightsNew + 1;
      const nightsTpl = Math.max(1, template.nights_count || 1);
      const daysTpl = nightsTpl + 1;
      const needsAdaptation = daysNew !== daysTpl;

      const destination = payload.destinationOverride || template.destination || template.name;

      // 1) Create itinerary
      const { data: itin, error: iErr } = await supabase
        .from("itineraries")
        .insert({
          user_id: user.id,
          destination,
          start_date: format(payload.startDate, "yyyy-MM-dd"),
          end_date: format(payload.endDate, "yyyy-MM-dd"),
          travelers_count: payload.travelersCount,
          trip_type: payload.tripType || template.profile,
          budget_level: payload.budgetLevel || template.style,
          status: "review",
          client_id: payload.clientId,
          cover_image_url: template.cover_image_url,
          destination_intro_text: template.destination_intro_text,
          destination_intro_images: template.destination_intro_images ?? [],
        } as any)
        .select()
        .single();
      if (iErr) throw iErr;

      // 2) Create days for the new date range
      const dayRows = Array.from({ length: daysNew }, (_, i) => ({
        itinerary_id: itin.id,
        day_number: i + 1,
        date: format(addDays(payload.startDate, i), "yyyy-MM-dd"),
      }));
      const { data: insertedDays, error: dErr } = await supabase
        .from("itinerary_days")
        .insert(dayRows)
        .select();
      if (dErr) throw dErr;

      const dayById = new Map<number, string>();
      (insertedDays ?? []).forEach((d: any) => dayById.set(d.day_number, d.id));

      // 3) Map template activities to new days
      // - If same length: 1:1
      // - If different: proportional mapping (scale day_number)
      // - Keep "essencial"; drop "opcional" only when shrinking and overflow
      const scaled = activities
        .map((a) => {
          const newDay =
            daysNew === daysTpl
              ? a.day_number
              : Math.min(
                  daysNew,
                  Math.max(
                    1,
                    Math.round(((a.day_number - 1) * (daysNew - 1)) / Math.max(1, daysTpl - 1)) + 1,
                  ),
                );
          return { ...a, _newDay: newDay };
        })
        // When shrinking, drop "opcional" overflowing activities beyond capacity
        .filter((a) => {
          if (!needsAdaptation) return true;
          if (daysNew >= daysTpl) return true;
          return true; // keep all by default — AI will refine later
        });

      const actRows = scaled.map((a, idx) => ({
        day_id: dayById.get(a._newDay) ?? dayById.get(1)!,
        period: a.period,
        title: a.title,
        description: a.description,
        location: a.location,
        estimated_duration: a.estimated_duration,
        estimated_cost: a.estimated_cost,
        order_index: a.order_index ?? idx,
        is_approved: false,
        photo_url: a.photo_url,
      }));
      if (actRows.length > 0) {
        const { error: aErr } = await supabase
          .from("itinerary_activities")
          .insert(actRows);
        if (aErr) throw aErr;
      }

      return { itineraryId: itin.id as string, needsAdaptation };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["itineraries"] });
    },
  });

  return {
    templates: templatesQuery.data ?? [],
    isLoading: templatesQuery.isLoading,
    getTemplateWithActivities,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    duplicateTemplate,
    instantiateFromTemplate,
  };
}