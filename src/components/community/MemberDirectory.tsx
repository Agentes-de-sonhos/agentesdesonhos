import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2, Search, Users } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { MemberProfileDialog } from "./MemberProfileDialog";
import { ALL_SPECIALTIES } from "@/types/community-members";
import type { CommunityMember } from "@/types/community-members";

const PAGE_SIZE = 24;

type AgentRow = {
  user_id: string;
  name: string;
  avatar_url: string | null;
  agency_name: string | null;
  city: string | null;
  state: string | null;
  specialties: string[] | null;
  status: string;
  is_verified: boolean;
  total_count: number;
};

function toMember(row: AgentRow): CommunityMember {
  return {
    id: row.user_id,
    user_id: row.user_id,
    status: row.is_verified ? "verified" : "approved_unverified",
    entry_method: "experience",
    cnpj: null,
    years_experience: null,
    bio: null,
    segments: null,
    specialties: row.specialties ?? [],
    created_at: "",
    updated_at: "",
    profile: {
      name: row.name,
      avatar_url: row.avatar_url,
      agency_name: row.agency_name,
      city: row.city,
      state: row.state,
    },
  };
}

export function MemberDirectory() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);

  // Debounce search input
  useMemo(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 250);
    return () => clearTimeout(t);
  }, [search]);

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery({
    queryKey: ["community-agents", debouncedSearch, filterSpecialty],
    initialPageParam: 0,
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await (supabase as any).rpc("list_community_agents", {
        p_search: debouncedSearch || null,
        p_specialty: filterSpecialty || null,
        p_limit: PAGE_SIZE,
        p_offset: pageParam as number,
      });
      if (error) throw error;
      const rows = (data ?? []) as AgentRow[];
      return {
        rows,
        nextOffset: (pageParam as number) + rows.length,
        total: rows[0]?.total_count ?? 0,
      };
    },
    getNextPageParam: (last) =>
      last.nextOffset < last.total ? last.nextOffset : undefined,
    staleTime: 2 * 60 * 1000,
  });

  const members: CommunityMember[] = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.rows.map(toMember)),
    [data],
  );
  const total = data?.pages?.[0]?.total ?? 0;

  const usedSpecialties = useMemo(
    () => ALL_SPECIALTIES.filter((s) => members.some((m) => m.specialties?.includes(s))),
    [members],
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
        {Array.from({ length: 10 }).map((_, i) => (
          <Skeleton key={i} className="h-48 rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou agência..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          {total} {total === 1 ? "membro" : "membros"}
        </div>
      </div>

      {(usedSpecialties.length > 0 || filterSpecialty) && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={!filterSpecialty ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setFilterSpecialty(null)}
          >
            Todos
          </Badge>
          {(filterSpecialty && !usedSpecialties.includes(filterSpecialty)
            ? [filterSpecialty, ...usedSpecialties]
            : usedSpecialties
          ).map((s) => (
            <Badge
              key={s}
              variant={filterSpecialty === s ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => setFilterSpecialty(filterSpecialty === s ? null : s)}
            >
              {s}
            </Badge>
          ))}
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum membro encontrado</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {members.map((m) => (
              <MemberCard key={m.user_id} member={m} onClick={() => setSelectedMember(m)} />
            ))}
          </div>

          {hasNextPage && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Carregando...
                  </>
                ) : (
                  "Carregar mais membros"
                )}
              </Button>
            </div>
          )}
        </>
      )}

      <MemberProfileDialog
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
      />
    </div>
  );
}
