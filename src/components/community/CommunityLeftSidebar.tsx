import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, MessageSquare, Users, Compass, CalendarDays, Briefcase, Pencil } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { SPECIALTY_OPTIONS } from "@/types/community-members";
import type { CommunityMember } from "@/types/community-members";

interface CommunityLeftSidebarProps {
  membership: CommunityMember | null;
  activeSection: string;
  onNavigate: (section: string) => void;
  filterSpecialty: string | null;
  onFilterSpecialty: (s: string | null) => void;
}

const NAV_ITEMS = [
  { id: "feed", label: "Feed", icon: MessageSquare },
  { id: "members", label: "Membros", icon: Users },
  { id: "content", label: "Conteúdos", icon: Compass },
  { id: "events", label: "Eventos", icon: CalendarDays },
  { id: "opportunities", label: "Oportunidades", icon: Briefcase },
];

export function CommunityLeftSidebar({
  membership,
  activeSection,
  onNavigate,
  filterSpecialty,
  onFilterSpecialty,
}: CommunityLeftSidebarProps) {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url, agency_name")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user?.id,
  });

  const name = profile?.name || "Membro";
  const initials = name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

  const allFilters = [
    ...SPECIALTY_OPTIONS.destinations.slice(0, 6),
    ...SPECIALTY_OPTIONS.segments.slice(0, 4),
    ...SPECIALTY_OPTIONS.niches.slice(0, 4),
  ];

  return (
    <div className="space-y-4">
      {/* User Profile Card */}
      <Card className="border-border/50">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Avatar className="h-12 w-12">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              {membership?.status === "verified" && (
                <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-4 w-4 text-emerald-500 bg-background rounded-full" />
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{name}</p>
              {profile?.agency_name && (
                <p className="text-xs text-muted-foreground truncate">{profile.agency_name}</p>
              )}
            </div>
          </div>

          {membership?.specialties && membership.specialties.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {membership.specialties.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                  {s}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <Card className="border-border/50">
        <CardContent className="py-2 px-2">
          <nav className="space-y-0.5">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeSection === item.id
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {item.label}
              </button>
            ))}
          </nav>
        </CardContent>
      </Card>

      {/* Specialty Filters */}
      <Card className="border-border/50">
        <CardContent className="pt-4 pb-3">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">
            Filtrar por especialidade
          </p>
          <div className="flex flex-wrap gap-1.5">
            <Badge
              variant={!filterSpecialty ? "default" : "outline"}
              className="cursor-pointer text-[10px]"
              onClick={() => onFilterSpecialty(null)}
            >
              Todos
            </Badge>
            {allFilters.map((s) => (
              <Badge
                key={s}
                variant={filterSpecialty === s ? "default" : "outline"}
                className="cursor-pointer text-[10px]"
                onClick={() => onFilterSpecialty(filterSpecialty === s ? null : s)}
              >
                {s}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
