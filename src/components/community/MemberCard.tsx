import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2 } from "lucide-react";
import type { CommunityMember } from "@/types/community-members";

interface MemberCardProps {
  member: CommunityMember;
  onClick?: () => void;
}

export function MemberCard({ member, onClick }: MemberCardProps) {
  const name = member.profile?.name || "Membro";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Card
      className="cursor-pointer hover:shadow-md transition-shadow border-border/50 hover:border-primary/30"
      onClick={onClick}
    >
      <CardContent className="pt-5 pb-4 flex flex-col items-center text-center gap-3">
        <div className="relative">
          <Avatar className="h-16 w-16">
            <AvatarImage src={member.profile?.avatar_url || ""} />
            <AvatarFallback className="bg-primary/10 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          {member.status === "verified" && (
            <CheckCircle2 className="absolute -bottom-0.5 -right-0.5 h-5 w-5 text-emerald-500 bg-background rounded-full" />
          )}
        </div>

        <div className="space-y-0.5">
          <h3 className="font-semibold text-sm text-foreground leading-tight">{name}</h3>
          {member.profile?.agency_name && (
            <p className="text-xs text-muted-foreground">{member.profile.agency_name}</p>
          )}
          {member.profile?.city && (
            <p className="text-[11px] text-muted-foreground/70">
              {member.profile.city}{member.profile.state ? `, ${member.profile.state}` : ""}
            </p>
          )}
        </div>

        {member.specialties && member.specialties.length > 0 && (
          <div className="flex flex-wrap justify-center gap-1">
            {member.specialties.slice(0, 3).map((s) => (
              <Badge key={s} variant="secondary" className="text-[10px] px-1.5 py-0">
                {s}
              </Badge>
            ))}
            {member.specialties.length > 3 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                +{member.specialties.length - 3}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
