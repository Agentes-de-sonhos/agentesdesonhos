import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PostComposerDialog } from "./PostComposerDialog";
import type { CreatePostPayload } from "./CreatePostForm";

interface CommunityComposerLauncherProps {
  onSubmit: (data: CreatePostPayload) => void;
  isCreating: boolean;
  compact?: boolean;
}

export function CommunityComposerLauncher({ onSubmit, isCreating, compact = false }: CommunityComposerLauncherProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const { data: profile } = useQuery({
    queryKey: ["community-composer-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
  });
  const initials = (profile?.name || "Você").split(" ").filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  return (
    <>
      <div className="flex min-w-0 items-center gap-3 rounded-lg border border-border/60 bg-card p-2 sm:px-3">
        {!compact && (
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={profile?.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">{initials}</AvatarFallback>
          </Avatar>
        )}
        <Button
          type="button"
          variant="ghost"
          className="h-9 min-w-0 flex-1 justify-start overflow-hidden rounded-full bg-muted px-3 text-left text-[13px] font-normal text-muted-foreground hover:bg-muted/80 sm:text-sm"
          onClick={() => setOpen(true)}
        >
          <span className="truncate whitespace-nowrap">O que você quer compartilhar hoje?</span>
        </Button>
      </div>
      <PostComposerDialog
        open={open}
        onOpenChange={setOpen}
        onSubmit={onSubmit}
        isCreating={isCreating}
        authorName={profile?.name}
        authorAvatarUrl={profile?.avatar_url}
      />
    </>
  );
}