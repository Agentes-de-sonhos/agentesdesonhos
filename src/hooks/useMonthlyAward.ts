import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type {
  CommunityMonthlyAward,
  CommunityMonthlyNominee,
} from "@/types/community-awards";

/**
 * Loads the current month's award row (auto-created on first call via the
 * `get_current_month_award` RPC) and the list of eligible nominees with their
 * public profile data.
 */
export function useMonthlyAward(enabled: boolean = true) {
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

  return {
    award: award ?? null,
    nominees: nomineesQuery.data ?? [],
    isLoading: awardQuery.isLoading || nomineesQuery.isLoading,
    refetch: async () => {
      await awardQuery.refetch();
      await nomineesQuery.refetch();
    },
  };
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