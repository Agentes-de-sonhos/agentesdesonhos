/**
 * Identificação do usuário no painel white label.
 *
 * Aparece SOMENTE na página inicial (as páginas internas não repetem faixa
 * com nome/avatar). Foto real quando cadastrada; sem foto, círculo na cor da
 * agência com iniciais e contraste automático (tokens `--wl-accent` /
 * `--wl-on-accent` definidos pelo shell).
 */
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, LifeBuoy, Settings, UserCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { AGENCY_ADMIN_LOGIN } from "@/lib/agencyAdmin";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

/** "Fernando Nobre" → FN · "Fernando" → FE */
export function userInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function AgencyUserBadge({ agencyName }: { agencyName?: string }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: profile } = useQuery({
    queryKey: ["agency-admin-profile", user?.id],
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });

  const userName = profile?.name?.trim() || user?.email || "Usuário";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Abrir menu do usuário"
          className="flex min-w-0 items-center gap-2.5 rounded-2xl border border-border/70 bg-card py-1.5 pl-1.5 pr-3 shadow-sm transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md"
        >
          <Avatar className="h-9 w-9">
            <AvatarImage
              src={profile?.avatar_url || undefined}
              alt={userName}
              className="object-cover"
            />
            <AvatarFallback
              className="text-xs font-semibold"
              style={{ backgroundColor: "var(--wl-accent)", color: "var(--wl-on-accent)" }}
            >
              {userInitials(userName)}
            </AvatarFallback>
          </Avatar>
          <span className="hidden min-w-0 flex-col text-left sm:flex">
            <span className="max-w-[180px] truncate text-sm font-medium leading-tight text-foreground">
              {userName}
            </span>
            {agencyName && (
              <span className="max-w-[180px] truncate text-[11px] leading-tight text-muted-foreground">
                {agencyName}
              </span>
            )}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem onClick={() => navigate("/gestao/perfil")}>
          <UserCircle className="mr-2 h-4 w-4" />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/gestao/minha-conta")}>
          <Settings className="mr-2 h-4 w-4" />
          Minha conta
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => navigate("/gestao/suporte")}>
          <LifeBuoy className="mr-2 h-4 w-4" />
          Suporte
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={async () => {
            await signOut();
            navigate(AGENCY_ADMIN_LOGIN, { replace: true });
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
