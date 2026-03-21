import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { CheckCircle2, MapPin, Briefcase, Clock } from "lucide-react";
import type { CommunityMember } from "@/types/community-members";

interface MemberProfileDialogProps {
  member: CommunityMember | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MemberProfileDialog({ member, open, onOpenChange }: MemberProfileDialogProps) {
  if (!member) return null;
  const name = member.profile?.name || "Membro";
  const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Perfil do membro</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          <div className="relative">
            <Avatar className="h-20 w-20">
              <AvatarImage src={member.profile?.avatar_url || ""} />
              <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            {member.status === "verified" && (
              <CheckCircle2 className="absolute -bottom-1 -right-1 h-6 w-6 text-emerald-500 bg-background rounded-full" />
            )}
          </div>

          <div className="text-center space-y-1">
            <h2 className="text-lg font-bold text-foreground flex items-center gap-1.5 justify-center">
              {name}
              {member.status === "verified" && (
                <span className="text-xs bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full">
                  Verificado
                </span>
              )}
            </h2>
            {member.profile?.agency_name && (
              <p className="text-sm text-muted-foreground flex items-center gap-1 justify-center">
                <Briefcase className="h-3.5 w-3.5" /> {member.profile.agency_name}
              </p>
            )}
            {member.profile?.city && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                <MapPin className="h-3 w-3" />
                {member.profile.city}{member.profile.state ? `, ${member.profile.state}` : ""}
              </p>
            )}
            {member.years_experience && (
              <p className="text-xs text-muted-foreground flex items-center gap-1 justify-center">
                <Clock className="h-3 w-3" /> {member.years_experience}+ anos de experiência
              </p>
            )}
          </div>
        </div>

        {member.bio && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-1 text-foreground">Sobre</h3>
              <p className="text-sm text-muted-foreground whitespace-pre-line">{member.bio}</p>
            </div>
          </>
        )}

        {member.specialties && member.specialties.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Especialidades</h3>
              <div className="flex flex-wrap gap-1.5">
                {member.specialties.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {member.segments && member.segments.length > 0 && (
          <>
            <Separator />
            <div>
              <h3 className="text-sm font-semibold mb-2 text-foreground">Segmentos</h3>
              <div className="flex flex-wrap gap-1.5">
                {member.segments.map((s) => (
                  <Badge key={s} variant="outline" className="text-xs">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
