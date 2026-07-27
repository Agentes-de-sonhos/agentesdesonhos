import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CommunityMonthlyAward,
  CommunityMonthlyNominee,
} from "@/types/community-awards";

export interface AwardTallyRow {
  award_id: string;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  agency_name: string | null;
  eligible: boolean;
  exclusion_reason: string | null;
  votes_count: number;
  contributions_count: number;
  active_days_count: number;
  third_party_replies_count: number;
  wins_this_year: number;
  won_previous_month: boolean;
  disqualified_by_history: boolean;
  history_reason: string | null;
}

export interface AwardHistoryRow {
  award_id: string;
  reference_month: number;
  reference_year: number;
  user_id: string;
  name: string | null;
  avatar_url: string | null;
  agency_name: string | null;
  votes_count: number | null;
  contributions_count: number | null;
  active_days_count: number | null;
  third_party_replies_count: number | null;
  tie_break_reason: string | null;
  published_at: string;
}

/**
 * Loads the current month's award row (auto-created on first call via the
 * `get_current_month_award` RPC) and the list of eligible nominees with their
 * public profile data.
 */
export function useMonthlyAward(enabled: boolean = true) {
  const queryClient = useQueryClient();
  const awardQuery = useQuery({
    queryKey: ["monthly-award", "current"],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc(
        "get_current_month_award",
      );
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as CommunityMonthlyAward | null;
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });

  const award = awardQuery.data;

  const nomineesQuery = useQuery({
    queryKey: ["monthly-award-nominees", award?.id],
    queryFn: async () => {
      if (!award?.id) return [] as CommunityMonthlyNominee[];
      const { data: nominees, error } = await (supabase as any)
        .from("community_monthly_nominees")
        .select("*")
        .eq("award_id", award.id)
        .eq("eligible", true)
        .order("contributions_count", { ascending: false });
      if (error) throw error;
      const userIds = (nominees ?? []).map((n: any) => n.user_id);
      if (!userIds.length) return [] as CommunityMonthlyNominee[];
      const { data: profiles } = await supabase
        .from("profiles_public")
        .select("user_id, name, avatar_url, agency_name, city, state")
        .in("user_id", userIds);
      const byUser = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => byUser.set(p.user_id, p));
      return (nominees ?? []).map((n: any) => ({
        ...n,
        profile: byUser.get(n.user_id) ?? null,
      })) as CommunityMonthlyNominee[];
    },
    enabled: enabled && !!award?.id,
    staleTime: 60 * 1000,
  });

  const myVoteQuery = useQuery({
    queryKey: ["monthly-award-my-vote", award?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("get_my_monthly_vote");
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      return (row ?? null) as { award_id: string; nominee_user_id: string } | null;
    },
    enabled: enabled && !!award?.id,
    staleTime: 30 * 1000,
  });

  const castVote = useMutation({
    mutationFn: async (nomineeUserId: string) => {
      const { data, error } = await (supabase as any).rpc("cast_monthly_vote", {
        _nominee_user_id: nomineeUserId,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-award-my-vote"] });
    },
  });

  return {
    award: award ?? null,
    nominees: nomineesQuery.data ?? [],
    myVote: myVoteQuery.data ?? null,
    castVote: (nomineeUserId: string) => castVote.mutateAsync(nomineeUserId),
    isVoting: castVote.isPending,
    isLoading: awardQuery.isLoading || nomineesQuery.isLoading,
    refetch: async () => {
      await awardQuery.refetch();
      await nomineesQuery.refetch();
      await myVoteQuery.refetch();
    },
  };
}

/**
 * Public history of confirmed monthly winners (published_at IS NOT NULL).
 */
export function useAwardHistory(limit = 24, enabled = true) {
  return useQuery({
    queryKey: ["monthly-award-history", limit],
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("list_award_history", {
        _limit: limit,
      });
      if (error) throw error;
      return (data ?? []) as AwardHistoryRow[];
    },
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Admin: full tally, confirm and revert operations for a given award.
 */
export function useAwardTally(awardId: string | null | undefined) {
  const queryClient = useQueryClient();

  const tallyQuery = useQuery({
    queryKey: ["monthly-award-tally", awardId],
    queryFn: async () => {
      if (!awardId) return [] as AwardTallyRow[];
      const { data, error } = await (supabase as any).rpc("get_award_tally", {
        _award_id: awardId,
      });
      if (error) throw error;
      return (data ?? []) as AwardTallyRow[];
    },
    enabled: !!awardId,
    staleTime: 30 * 1000,
  });

  const confirm = useMutation({
    mutationFn: async (payload: {
      awardId: string;
      winnerUserId: string;
      tieBreakReason?: string | null;
    }) => {
      const { data, error } = await (supabase as any).rpc("confirm_award_winner", {
        _award_id: payload.awardId,
        _winner_user_id: payload.winnerUserId,
        _tie_break_reason: payload.tieBreakReason ?? null,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-award"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-award-tally"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-award-history"] });
    },
  });

  const revert = useMutation({
    mutationFn: async (awardIdToRevert: string) => {
      const { data, error } = await (supabase as any).rpc(
        "revert_award_confirmation",
        { _award_id: awardIdToRevert },
      );
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["monthly-award"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-award-tally"] });
      queryClient.invalidateQueries({ queryKey: ["monthly-award-history"] });
    },
  });

  return {
    tally: tallyQuery.data ?? [],
    isLoading: tallyQuery.isLoading,
    refetch: tallyQuery.refetch,
    confirm: (winnerUserId: string, tieBreakReason?: string | null) =>
      confirm.mutateAsync({
        awardId: awardId!,
        winnerUserId,
        tieBreakReason,
      }),
    isConfirming: confirm.isPending,
    revert: (idToRevert: string) => revert.mutateAsync(idToRevert),
    isReverting: revert.isPending,
  };
}

/**
 * List of past awards (admin) — used to pick which month to audit.
 */
export function useAwardsList(enabled = true) {
  return useQuery({
    queryKey: ["monthly-awards-list"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("community_monthly_awards")
        .select("*")
        .order("reference_year", { ascending: false })
        .order("reference_month", { ascending: false })
        .limit(36);
      if (error) throw error;
      return (data ?? []) as CommunityMonthlyAward[];
    },
    enabled,
    staleTime: 2 * 60 * 1000,
  });
}

/**
 * Voting-window helpers, computed on the client using the ISO timestamps
 * persisted by `get_current_month_award` (which are anchored to America/Sao_Paulo).
 */
export function getVotingPhase(award: CommunityMonthlyAward | null): {
  phase: "before" | "voting" | "closed";
  startAt: Date | null;
  endAt: Date | null;
  msUntilStart: number;
  msUntilEnd: number;
} {
  if (!award?.voting_start_at || !award?.voting_end_at) {
    return { phase: "before", startAt: null, endAt: null, msUntilStart: 0, msUntilEnd: 0 };
  }
  const start = new Date(award.voting_start_at);
  const end = new Date(award.voting_end_at);
  const now = Date.now();
  if (now < start.getTime()) {
    return {
      phase: "before",
      startAt: start,
      endAt: end,
      msUntilStart: start.getTime() - now,
      msUntilEnd: end.getTime() - now,
    };
  }
  if (now <= end.getTime()) {
    return {
      phase: "voting",
      startAt: start,
      endAt: end,
      msUntilStart: 0,
      msUntilEnd: end.getTime() - now,
    };
  }
  return { phase: "closed", startAt: start, endAt: end, msUntilStart: 0, msUntilEnd: 0 };
}