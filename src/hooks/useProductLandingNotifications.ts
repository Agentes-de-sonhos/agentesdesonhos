import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { DayKey } from "@/lib/officeHours";

export interface NotificationMember {
  id: string;
  full_name: string;
  role_title: string | null;
  status: "active" | "blocked";
  email: string | null;
  eligible: boolean;
}

export interface NotificationSettings {
  email_enabled: boolean;
  include_owner: boolean;
  default_assignee_member_id: string | null;
  notify_days: DayKey[];
  notify_start: string;
  notify_end: string;
  outside_behavior: string;
  allow_test_sends: boolean;
}

export interface NotificationConfig {
  landing_id: string;
  timezone: string;
  owner_email: string | null;
  settings: NotificationSettings | null;
  recipient_member_ids: string[];
  members: NotificationMember[];
}

export const DEFAULT_NOTIFICATION_SETTINGS: NotificationSettings = {
  email_enabled: false,
  include_owner: true,
  default_assignee_member_id: null,
  notify_days: ["mon", "tue", "wed", "thu", "fri"],
  notify_start: "08:00",
  notify_end: "18:00",
  outside_behavior: "next_window",
  allow_test_sends: false,
};

/** Owner-only configuration of the "new lead" e-mail notifications. */
export function useProductLandingNotifications(landingId?: string) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["product-landing-notifications", landingId],
    enabled: !!landingId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_product_landing_notifications" as never, {
        p_landing_id: landingId,
      } as never);
      if (error) throw error;
      const res = data as unknown as NotificationConfig & { error?: string };
      if (res?.error) throw new Error(res.error);
      return {
        ...res,
        recipient_member_ids: (res.recipient_member_ids ?? []).filter(Boolean),
      } as NotificationConfig;
    },
  });

  const save = useMutation({
    mutationFn: async (config: NotificationSettings & { recipient_member_ids: string[] }) => {
      const { data, error } = await supabase.rpc("save_product_landing_notifications" as never, {
        p_landing_id: landingId,
        p_config: config as never,
      } as never);
      if (error) throw error;
      const res = data as { error?: string; recipients?: number; dropped_members?: number };
      if (res?.error) throw new Error(res.error);
      return res;
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["product-landing-notifications", landingId] });
      if (res?.dropped_members) {
        toast.warning(
          `${res.dropped_members} membro(s) foram removidos da lista por estarem inativos ou sem e-mail válido.`,
        );
      }
      toast.success("Notificações de leads salvas!");
    },
    onError: (err: Error) => toast.error(err.message || "Não foi possível salvar as notificações"),
  });

  return { query, save };
}

/** Deliveries log for a landing (read-only, tenant-isolated by RLS). */
export function useLeadDeliveries(landingId?: string) {
  return useQuery({
    queryKey: ["product-landing-lead-deliveries", landingId],
    enabled: !!landingId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_landing_lead_deliveries" as never)
        .select("id, recipient_email, status, attempts, scheduled_for, sent_at, error_message, created_at")
        .eq("landing_id", landingId as never)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        recipient_email: string;
        status: string;
        attempts: number;
        scheduled_for: string;
        sent_at: string | null;
        error_message: string | null;
        created_at: string;
      }>;
    },
  });
}