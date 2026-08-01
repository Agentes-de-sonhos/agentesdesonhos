import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import type { DayKey } from "@/lib/officeHours";
import type { LeadFormSettings } from "@/lib/leadFormConfig";

const FORM_COLUMNS =
  "id, token, is_active, headline, welcome_message, closing_message, brand_color, agency_name_override, logo_url_override, consultant_name_override, consultant_role_override, consultant_photo_url_override, whatsapp_override, timezone, office_hours, hours_confirmed, ask_email, require_email, ask_dates, ask_travelers, ask_budget, ai_enabled, privacy_url, terms_url, test_mode_until, views_count, leads_count";

/** The agency's own conversational form, created on first access. */
export function useLeadFormSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-form-settings", user?.id],
    enabled: !!user?.id,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_capture_forms")
        .select(FORM_COLUMNS)
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      if (data) return data as unknown as LeadFormSettings;

      const { data: created, error: createError } = await supabase
        .from("lead_capture_forms")
        .insert({ user_id: user!.id } as never)
        .select(FORM_COLUMNS)
        .single();
      if (createError) throw createError;
      return created as unknown as LeadFormSettings;
    },
  });

  const update = useMutation({
    mutationFn: async (patch: Partial<LeadFormSettings>) => {
      const id = query.data?.id;
      if (!id) throw new Error("Formulário não encontrado");
      const { error } = await supabase
        .from("lead_capture_forms")
        .update(patch as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lead-form-settings"] });
      toast.success("Configurações salvas!");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível salvar"),
  });

  return { form: query.data, isLoading: query.isLoading, update };
}

export interface LeadFormNotificationSettings {
  email_enabled: boolean;
  include_owner: boolean;
  notify_days: DayKey[];
  notify_start: string;
  notify_end: string;
  outside_behavior: string;
  allow_test_sends: boolean;
}

export interface LeadFormNotificationMember {
  id: string;
  full_name: string;
  role_title: string | null;
  status: "active" | "blocked";
  email: string | null;
  eligible: boolean;
}

export interface LeadFormNotificationConfig {
  form_id: string;
  timezone: string;
  owner_email: string | null;
  settings: LeadFormNotificationSettings | null;
  recipient_member_ids: string[];
  members: LeadFormNotificationMember[];
}

export const DEFAULT_LEAD_FORM_NOTIFICATIONS: LeadFormNotificationSettings = {
  email_enabled: false,
  include_owner: true,
  notify_days: ["mon", "tue", "wed", "thu", "fri"],
  notify_start: "08:00",
  notify_end: "18:00",
  outside_behavior: "next_window",
  allow_test_sends: false,
};

/** E-mail notification configuration for the conversational form. */
export function useLeadFormNotifications(formId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["lead-form-notifications", formId],
    enabled: !!formId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_lead_form_notifications", { p_form_id: formId! });
      if (error) throw error;
      const res = data as unknown as LeadFormNotificationConfig & { error?: string };
      if (res?.error) throw new Error(res.error);
      return {
        ...res,
        recipient_member_ids: (res.recipient_member_ids ?? []).filter(Boolean),
      } as LeadFormNotificationConfig;
    },
  });

  const save = useMutation({
    mutationFn: async (
      config: LeadFormNotificationSettings & { recipient_member_ids: string[] },
    ) => {
      if (!formId || !user?.id) throw new Error("Formulário não encontrado");
      const { recipient_member_ids, ...settings } = config;

      const { error: settingsError } = await supabase
        .from("lead_form_notification_settings")
        .upsert(
          { form_id: formId, user_id: user.id, ...settings } as never,
          { onConflict: "form_id" },
        );
      if (settingsError) throw settingsError;

      const members = (query.data?.members ?? []).filter(
        (m) => recipient_member_ids.includes(m.id) && m.eligible,
      );
      const dropped = recipient_member_ids.length - members.length;

      const rows = members.map((m) => ({
        form_id: formId,
        user_id: user.id,
        kind: "member",
        team_member_id: m.id,
        email: (m.email ?? "").toLowerCase(),
        active: true,
      }));
      if (settings.include_owner && query.data?.owner_email) {
        rows.push({
          form_id: formId,
          user_id: user.id,
          kind: "owner",
          team_member_id: null as unknown as string,
          email: query.data.owner_email.toLowerCase(),
          active: true,
        });
      }

      // Full replace keeps the recipient list exactly as configured.
      const { error: deleteError } = await supabase
        .from("lead_form_notification_recipients")
        .delete()
        .eq("form_id", formId);
      if (deleteError) throw deleteError;

      if (rows.length) {
        const { error: insertError } = await supabase
          .from("lead_form_notification_recipients")
          .insert(rows as never);
        if (insertError) throw insertError;
      }

      return { dropped };
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["lead-form-notifications", formId] });
      if (res.dropped > 0) {
        toast.warning(
          `${res.dropped} membro(s) foram ignorados por estarem inativos ou sem e-mail válido.`,
        );
      }
      toast.success("Notificações salvas!");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível salvar as notificações"),
  });

  return { query, save };
}

/** Read-only delivery log for the conversational form. */
export function useLeadFormDeliveries(formId?: string) {
  return useQuery({
    queryKey: ["lead-form-deliveries", formId],
    enabled: !!formId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lead_form_lead_deliveries")
        .select("id, recipient_email, status, attempts, scheduled_for, sent_at, error_message, created_at")
        .eq("form_id", formId!)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
}
