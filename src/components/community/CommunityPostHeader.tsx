import type { ReactNode } from "react";
import { CheckCircle2, Pin } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { CommunityPost } from "@/types/community-members";

interface CommunityPostHeaderProps {
  post: CommunityPost;
  timeLabel: string;
  controls: ReactNode;
  className?: string;
  compact?: boolean;
  normalizeName?: boolean;
}

function initials(name?: string | null) {
  return (name || "Membro").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();
}

function titleCase(name: string) {
  const lower = name.toLowerCase();
  return lower.replace(/(^|\s|['-])(\p{L})/gu, (_, separator, letter) => separator + letter.toUpperCase());
}

export function CommunityPostHeader({
  post,
  timeLabel,
  controls,
  className,
  compact = false,
  normalizeName = false,
}: CommunityPostHeaderProps) {
  const rawName = post.profile?.name || "Membro da comunidade";
  const name = normalizeName ? titleCase(rawName) : rawName;
  const wasEdited = !!(post as CommunityPost & { edited_at?: string | null }).edited_at;

  return (
    <header className={cn("flex min-w-0 items-start gap-3", className)}>
      <Avatar className={cn("shrink-0", compact ? "h-9 w-9" : "h-10 w-10")}>
        <AvatarImage src={post.profile?.avatar_url || undefined} alt={name} />
        <AvatarFallback className="bg-primary/10 text-sm font-semibold text-primary">
          {initials(name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1 overflow-hidden">
        <div className="flex min-w-0 items-center gap-1.5">
          <span className="min-w-0 truncate whitespace-nowrap text-sm font-semibold text-foreground">{name}</span>
          {post.member?.status === "verified" && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />}
          {post.is_pinned && <Pin className="h-3.5 w-3.5 shrink-0 text-amber-500" />}
        </div>
        {post.profile?.agency_name && (
          <p className="truncate whitespace-nowrap text-xs text-muted-foreground">{post.profile.agency_name}</p>
        )}
        <p className="mt-0.5 truncate whitespace-nowrap text-xs text-muted-foreground">
          {timeLabel}{wasEdited && <span className="ml-1 italic text-muted-foreground/80">· Editado</span>}
        </p>
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">{controls}</div>
    </header>
  );
}