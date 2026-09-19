import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Headset, LogOut, Settings, UserRound } from "lucide-react";
import { Link } from "react-router-dom";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useTeamSession } from "@/contexts/TeamSessionContext";
import { supabase } from "@/integrations/supabase/client";
import { getPersonInitials } from "@/components/shared/ClientAvatar";
import { cn } from "@/lib/utils";

interface AppSidebarAccountProps {
  collapsed?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onNavigate?: () => void;
  onSignOut: () => void;
}

export function AppSidebarAccount({
  collapsed = false,
  open,
  onOpenChange,
  onNavigate,
  onSignOut,
}: AppSidebarAccountProps) {
  const { user } = useAuth();
  const { member, accessProfile } = useTeamSession();
  const userId = user?.id;
  const { data: profile } = useQuery({
    queryKey: ["app-sidebar-profile", userId],
    enabled: Boolean(userId),
    staleTime: 2 * 60 * 1000,
    queryFn: async () => {
      if (!userId) return null;
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url, agency_name")
        .eq("user_id", userId)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null; agency_name: string | null } | null;
    },
  });

  const emailName = (user?.email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const fullName = profile?.name?.trim() || member?.full_name?.trim() || emailName || "Usuário";
  const accountLabel = profile?.agency_name?.trim() || accessProfile?.name?.trim() || "Agentes de Sonhos";
  const avatarUrl = profile?.avatar_url || member?.avatar_url || undefined;

  const accountItems = [
    { label: "Meu perfil", to: "/perfil", icon: UserRound },
    { label: "Minha conta", to: "/minha-conta", icon: Settings },
    { label: "Suporte", to: "/suporte", icon: Headset },
  ];

  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="Abrir menu da conta"
          aria-haspopup="menu"
          aria-expanded={open}
          className={cn(
            "h-auto rounded-xl text-sidebar-foreground hover:bg-sidebar-accent focus-visible:ring-2 focus-visible:ring-ring",
            collapsed ? "w-full justify-center px-0 py-1.5" : "w-full justify-start gap-2.5 px-2 py-1.5",
          )}
        >
          <Avatar className="h-9 w-9 shrink-0">
            <AvatarImage src={avatarUrl} alt={fullName} className="object-cover" />
            <AvatarFallback className="bg-primary text-xs font-semibold text-primary-foreground">
              {getPersonInitials(fullName)}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 text-left">
                <span className="block truncate text-sm font-medium leading-tight">{fullName}</span>
                <span className="block truncate text-xs leading-tight text-muted-foreground">{accountLabel}</span>
              </span>
              <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        side={collapsed ? "right" : "top"}
        sideOffset={8}
        data-app-sidebar-account-menu
        data-workspace-menu
        className="min-w-56 rounded-xl p-1.5"
      >
        {accountItems.map((item) => (
          <DropdownMenuItem key={item.to} asChild>
            <Link to={item.to} data-workspace-title={item.label} onClick={onNavigate} className="gap-3 rounded-lg py-2.5">
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={onSignOut}
          className="gap-3 rounded-lg py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
        >
          <LogOut className="h-4 w-4" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}