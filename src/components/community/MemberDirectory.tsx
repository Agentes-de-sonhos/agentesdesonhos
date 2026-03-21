import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Users } from "lucide-react";
import { MemberCard } from "./MemberCard";
import { MemberProfileDialog } from "./MemberProfileDialog";
import { ALL_SPECIALTIES } from "@/types/community-members";
import type { CommunityMember } from "@/types/community-members";

export function MemberDirectory() {
  const [search, setSearch] = useState("");
  const [filterSpecialty, setFilterSpecialty] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<CommunityMember | null>(null);

  const { data: members = [], isLoading } = useQuery({
    queryKey: ["community-members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("community_members")
        .select("*")
        .in("status", ["approved_unverified", "verified"])
        .order("created_at", { ascending: false });
      if (error) throw error;
      if (!data || data.length === 0) return [];

      const userIds = data.map((m: any) => m.user_id);
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, name, avatar_url, agency_name, city, state")
        .in("user_id", userIds);

      return data.map((m: any) => ({
        ...m,
        profile: profiles?.find((p: any) => p.user_id === m.user_id),
      })) as CommunityMember[];
    },
  });

  const filtered = members.filter((m) => {
    const matchesSearch =
      !search ||
      m.profile?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.profile?.agency_name?.toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty =
      !filterSpecialty || (m.specialties && m.specialties.includes(filterSpecialty));
    return matchesSearch && matchesSpecialty;
  });

  const usedSpecialties = ALL_SPECIALTIES.filter((s) =>
    members.some((m) => m.specialties?.includes(s))
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
          {filtered.length} membros
        </div>
      </div>

      {usedSpecialties.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          <Badge
            variant={!filterSpecialty ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => setFilterSpecialty(null)}
          >
            Todos
          </Badge>
          {usedSpecialties.map((s) => (
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

      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum membro encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filtered.map((m) => (
            <MemberCard key={m.id} member={m} onClick={() => setSelectedMember(m)} />
          ))}
        </div>
      )}

      <MemberProfileDialog
        member={selectedMember}
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
      />
    </div>
  );
}
