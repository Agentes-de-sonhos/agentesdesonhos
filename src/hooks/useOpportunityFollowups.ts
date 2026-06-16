import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useAgencyOwnerId } from "@/hooks/useAgencyOwnerId";
import { toast } from "sonner";

export interface OpportunityFollowup {
  id: string;
  opportunity_id: string;
  user_id: string;
  created_by: string | null;
  follow_up_date: string; // YYYY-MM-DD
  note: string | null;
  created_at: string;
  updated_at: string;
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
      return (data || []) as unknown as OpportunityFollowup[];
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
        .select("id")
        .eq("opportunity_id", opportunity_id);
      if (existing.error) throw existing.error;

      const existingIds = new Set((existing.data || []).map((r: any) => r.id));
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
  const { agencyOwnerId } = useAgencyOwnerId();
  return useQuery({
    queryKey: ["all-followups", agencyOwnerId, user?.id],
    queryFn: async () => {
      if (!user?.id || !agencyOwnerId) return [];
      const { data, error } = await supabase
        .from("opportunity_followups" as any)
        .select("*, opportunity:opportunities(id, destination, client:clients(name))")
        .eq("user_id", agencyOwnerId)
        .order("follow_up_date", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user?.id && !!agencyOwnerId,
    staleTime: 2 * 60 * 1000,
  });
}