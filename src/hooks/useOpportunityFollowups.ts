import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { toast } from "sonner";

// Fire-and-forget trigger to push the mirrored agency_events to Google Calendar
// immediately after a follow-up create/update/delete. Uses force:true to bypass
// the 60s rate-limit so deletions propagate without waiting for the cron.
function triggerGoogleCalendarSync() {
  if (typeof window === "undefined") return;
  setTimeout(() => {
    supabase.functions
      .invoke("google-calendar-sync", { body: { action: "sync", force: true } })
      .catch(() => { /* cron will catch up */ });
  }, 500);
}

export interface OpportunityFollowup {
  id: string;
  opportunity_id: string;
  user_id: string;
  created_by: string | null;
  follow_up_date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  updated_at: string;
  author_name?: string | null;
}

export interface FollowupDraft {
  id?: string; // existing row id when editing
  follow_up_date: string;
  note: string;
}

/**
 * Manage follow-ups for a single opportunity.
 */
export function useOpportunityFollowups(opportunityId?: string) {
  const { user } = useAuth();
  const { agencyOwnerId } = useAgencyOwnerId();
  const queryClient = useQueryClient();

  const { data: followups = [], isLoading } = useQuery({
    queryKey: ["opportunity-followups", opportunityId, agencyOwnerId, user?.id],
    queryFn: async () => {
      if (!opportunityId) return [];
      const { data, error } = await supabase
        .from("opportunity_followups" as any)
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("follow_up_date", { ascending: true });
      if (error) throw error;
      const rows = (data || []) as unknown as OpportunityFollowup[];
      const authorIds = Array.from(
        new Set(rows.map((r) => r.created_by).filter(Boolean) as string[])
      );
      if (authorIds.length === 0) return rows;
      // Resolve author names from multiple sources. We must work for both
      // master and collaborator viewers, even though `profiles` RLS only
      // allows each user to read their own row. We use:
      //   1) get_public_profiles RPC (SECURITY DEFINER) — safe cross-user
      //      lookup of profile names (handles the master in a collaborator's
      //      session, and other masters/users in general).
      //   2) agency_team_members.full_name (keyed by auth_user_id) — for
      //      collaborators that may not have a profile row.
      //   3) profiles.name direct read — kept as a fast path for the
      //      currently-logged-in user (always readable by RLS).
      const [publicProfilesRes, profilesRes, teamRes] = await Promise.all([
        supabase.rpc("get_public_profiles" as any, { _user_ids: authorIds }),
        supabase
          .from("profiles")
          .select("user_id, name")
          .in("user_id", authorIds),
        supabase
          .from("agency_team_members" as any)
          .select("auth_user_id, full_name, login")
          .in("auth_user_id", authorIds),
      ]);
      const nameById = new Map<string, string | null>();
      for (const p of (publicProfilesRes.data || []) as any[]) {
        const n = (p.name as string | null)?.trim();
        if (p.user_id && n) nameById.set(p.user_id, n);
      }
      for (const p of (profilesRes.data || []) as any[]) {
        if (nameById.get(p.user_id)) continue;
        const n = (p.name as string | null)?.trim();
        if (p.user_id && n) nameById.set(p.user_id, n);
      }
      for (const t of (teamRes.data || []) as any[]) {
        if (!t.auth_user_id) continue;
        if (nameById.get(t.auth_user_id)) continue;
        const n =
          (t.full_name as string | null)?.trim() ||
          (t.login as string | null)?.trim() ||
          null;
        if (n) nameById.set(t.auth_user_id, n);
      }
      return rows.map((r) => ({
        ...r,
        author_name: r.created_by ? nameById.get(r.created_by) ?? null : null,
      }));
    },
    enabled: !!opportunityId,
  });

  /**
   * Replace the full set of follow-ups for an opportunity with the provided list.
   * Empty notes are allowed; entries without a date are skipped.
   */
  const syncMutation = useMutation({
    mutationFn: async ({
      opportunity_id,
      drafts,
    }: {
      opportunity_id: string;
      drafts: FollowupDraft[];
    }) => {
      if (!user) throw new Error("Not authenticated");

      const existing = await supabase
        .from("opportunity_followups" as any)
        .select("id, follow_up_date, note")
        .eq("opportunity_id", opportunity_id);
      if (existing.error) throw existing.error;

      const existingById = new Map(
        (existing.data || []).map((r: any) => [r.id as string, r])
      );
      const existingIds = new Set(existingById.keys());
      const keepIds = new Set(
        drafts.filter((d) => d.id && d.follow_up_date).map((d) => d.id as string)
      );

      // Delete removed
      const toDelete = [...existingIds].filter((id) => !keepIds.has(id));
      if (toDelete.length) {
        const { error } = await supabase
          .from("opportunity_followups" as any)
          .delete()
          .in("id", toDelete);
        if (error) throw error;
      }

      // Upsert remaining
      for (const draft of drafts) {
        if (!draft.follow_up_date) continue;
        if (draft.id) {
          // Skip update when nothing actually changed — avoids touching the row
          // and any triggers when the master simply re-saves the opportunity.
          const prev = existingById.get(draft.id);
          if (
            prev &&
            prev.follow_up_date === draft.follow_up_date &&
            (prev.note || null) === (draft.note || null)
          ) {
            continue;
          }
          const { error } = await supabase
            .from("opportunity_followups" as any)
            .update({
              follow_up_date: draft.follow_up_date,
              note: draft.note || null,
            })
            .eq("id", draft.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from("opportunity_followups" as any)
            .insert({
              opportunity_id,
              // user_id and created_by are normalized by the DB trigger
              user_id: agencyOwnerId || user.id,
              follow_up_date: draft.follow_up_date,
              note: draft.note || null,
            });
          if (error) throw error;
        }
      }
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["opportunity-followups", vars.opportunity_id] });
      queryClient.invalidateQueries({ queryKey: ["all-followups"] });
      queryClient.invalidateQueries({ queryKey: ["agenda-followups"] });
      queryClient.invalidateQueries({ queryKey: ["agency-events"] });
      triggerGoogleCalendarSync();
    },
    onError: (err: any) => {
      console.error("Erro ao salvar follow-ups:", err);
      toast.error("Erro ao salvar follow-ups");
    },
  });

  return {
    followups,
    isLoading,
    syncFollowups: syncMutation.mutateAsync,
    isSyncing: syncMutation.isPending,
  };
}

/**
 * Fetch all follow-ups for the current user (used by Agenda / Dashboard).
 */
export function useAllFollowups() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["all-followups", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const { data, error } = await supabase
        .from("opportunity_followups" as any)
        .select("*, opportunity:opportunities(id, destination, client:clients(name))")
        .eq("created_by", user.id)
        .order("follow_up_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id,
    staleTime: 2 * 60 * 1000,
  });
}