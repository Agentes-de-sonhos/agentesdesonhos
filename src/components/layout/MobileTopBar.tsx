import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { MessageCircle, Search, Users } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommunitySearchOverlay } from "@/components/community/CommunitySearchOverlay";

export const OPEN_COMMUNITY_CHAT_EVENT = "community-chat:open";

function initials(name?: string | null) {
  if (!name) return "?";
  return name.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}

/**
 * Cabeçalho compacto exibido apenas no mobile da plataforma Agentes de Sonhos
 * (Início e Comunidade): avatar, campo de busca e acesso ao chat.
 */
export function MobileTopBar({ embedded = false }: { embedded?: boolean }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchOpen, setSearchOpen] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["mobile-topbar-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", user!.id)
        .maybeSingle();
      return data;
    },
  });

  if (embedded) {
    return (
      <div className="space-y-3" data-mobile-top-bar data-dashboard-community-header>
        <div className="flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
              <Users className="h-5 w-5 shrink-0 text-[hsl(var(--section-community))]" />
              Comunidade
            </h2>
            <div className="mt-1.5 h-1 w-full rounded-full bg-[hsl(var(--section-community))]" />
          </div>
          <Button
            type="button"
            size="icon"
            aria-label="Abrir chat"
            onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMUNITY_CHAT_EVENT))}
            className="h-10 w-10 shrink-0 rounded-full bg-[hsl(var(--section-community))] text-primary-foreground hover:bg-[hsl(var(--section-community))]/90 lg:hidden"
          >
            <MessageCircle className="h-5 w-5" />
          </Button>
        </div>

        <Button
          type="button"
          variant="ghost"
          aria-label="Pesquisar na comunidade"
          onClick={() => setSearchOpen(true)}
          className="h-10 w-full justify-start gap-2 rounded-full bg-muted px-3 text-sm font-normal text-muted-foreground hover:bg-muted/80 lg:hidden"
        >
          <Search className="h-4 w-4 shrink-0" />
          <span className="truncate">Pesquisar</span>
        </Button>

        <CommunitySearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
      </div>
    );
  }

  return (
    <div
      className="sticky top-0 z-30 -mx-4 mb-3 flex items-center gap-2 border-b border-border bg-background/95 px-4 py-2 backdrop-blur lg:hidden"
      data-mobile-top-bar
    >
      <button
        type="button"
        aria-label="Abrir meu perfil"
        onClick={() => navigate("/perfil")}
        className="shrink-0 rounded-full"
      >
        <Avatar className="h-9 w-9">
          <AvatarImage src={profile?.avatar_url || undefined} alt={profile?.name || "Meu perfil"} />
          <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
            {initials(profile?.name)}
          </AvatarFallback>
        </Avatar>
      </button>

      <button
        type="button"
        aria-label="Pesquisar na comunidade"
        onClick={() => setSearchOpen(true)}
        className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-full bg-muted px-3 text-left text-sm text-muted-foreground"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Pesquisar</span>
      </button>

      <button
        type="button"
        aria-label="Abrir chat"
        onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMUNITY_CHAT_EVENT))}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted text-foreground"
      >
        <MessageCircle className="h-5 w-5" />
      </button>

      <CommunitySearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
  );
}
