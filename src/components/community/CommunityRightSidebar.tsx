import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Trophy, CalendarDays, TrendingUp, Users } from "lucide-react";
import type { CommunityMember } from "@/types/community-members";
import type { CommunityHighlight, InPersonEvent } from "@/types/community";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { CommunityPost } from "@/types/community-members";

interface CommunityRightSidebarProps {
  members: CommunityMember[];
  highlights: CommunityHighlight[];
  events: InPersonEvent[];
  posts: CommunityPost[];
  onMemberClick: (member: CommunityMember) => void;
}

export function CommunityRightSidebar({
  members,
  highlights,
  events,
  posts,
  onMemberClick,
}: CommunityRightSidebarProps) {
  const featuredMembers = members
    .filter((m) => m.status === "verified")
    .slice(0, 5);
  const recentMembers = featuredMembers.length < 5
    ? members.filter((m) => !featuredMembers.includes(m)).slice(0, 5 - featuredMembers.length)
    : [];
  const displayMembers = [...featuredMembers, ...recentMembers].slice(0, 5);

  // Trending tags from posts
  const tagCounts: Record<string, number> = {};
  posts.forEach((p) => {
    p.tags?.forEach((t) => {
      tagCounts[t] = (tagCounts[t] || 0) + 1;
    });
  });
  const trendingTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8);

  const upcomingEvents = events
    .filter((e) => new Date(e.event_date) >= new Date())
    .slice(0, 3);

  return (
    <div className="space-y-4">
      {/* Featured Members */}
      <Card className="border-border/50">
        <CardContent className="pt-4 pb-3">
          <div className="flex items-center gap-2 mb-3">
            <Users className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Membros em Destaque</p>
          </div>
          <div className="space-y-2.5">
            {displayMembers.map((m) => {
              const name = m.profile?.name || "Membro";
              const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
              return (
                <button
                  key={m.id}
                  onClick={() => onMemberClick(m)}
                  className="w-full flex items-center gap-2.5 hover:bg-muted/50 rounded-md p-1.5 -mx-1.5 transition-colors text-left"
                >
                  <div className="relative">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={m.profile?.avatar_url || ""} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    {m.status === "verified" && (
                      <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 text-emerald-500 bg-background rounded-full" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">{name}</p>
                    {m.specialties?.[0] && (
                      <p className="text-[10px] text-muted-foreground truncate">{m.specialties[0]}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Highlights */}
      {highlights.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Trophy className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold text-foreground">Destaques</p>
            </div>
            <div className="space-y-2.5">
              {highlights.slice(0, 3).map((h, i) => (
                <div key={h.id} className="flex items-center gap-2.5">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={h.profile?.avatar_url || ""} />
                    <AvatarFallback className="bg-amber-100 text-amber-700 text-xs">
                      {i + 1}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-foreground truncate">
                      {h.profile?.name || "Agente"}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {h.contribution_summary}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] px-1.5 shrink-0">
                    {h.vote_count} votos
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Upcoming Events */}
      {upcomingEvents.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <CalendarDays className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Próximos Eventos</p>
            </div>
            <div className="space-y-2.5">
              {upcomingEvents.map((e) => (
                <div key={e.id} className="space-y-0.5">
                  <p className="text-xs font-medium text-foreground line-clamp-1">{e.theme}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <CalendarDays className="h-3 w-3" />
                    {format(new Date(e.event_date), "dd MMM", { locale: ptBR })}
                    <span>·</span>
                    <span>{e.city}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trending Tags */}
      {trendingTags.length > 0 && (
        <Card className="border-border/50">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <p className="text-sm font-semibold text-foreground">Tendências</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trendingTags.map(([tag, count]) => (
                <Badge key={tag} variant="outline" className="text-[10px] cursor-pointer hover:bg-muted">
                  #{tag} <span className="ml-1 text-muted-foreground">{count}</span>
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
