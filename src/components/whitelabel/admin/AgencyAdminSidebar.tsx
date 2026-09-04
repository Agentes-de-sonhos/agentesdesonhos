/**
 * Menu lateral do painel administrativo white label — CONTÊINER de dados.
 *
 * Responsabilidades exclusivas deste arquivo: autenticação, permissões,
 * sessão de equipe, workspace (abas) e perfil do usuário. Toda a apresentação
 * vive em `AgencyAdminSidebarView`, compartilhada com o laboratório (Site Lab),
 * o que garante paridade visual/comportamental estrutural.
 */
import { useCallback, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamSession } from "@/contexts/TeamSessionContext";
import { agencyDisplayName } from "@/lib/agencyDomains";
import { resolveAgencyLogoUrl } from "@/lib/agencySiteBrand";
import { AGENCY_ADMIN_HOME, AGENCY_ADMIN_LOGIN, type AgencyAdminPortalInfo } from "@/lib/agencyAdmin";
import { getPersonInitials } from "@/components/shared/ClientAvatar";
import { useWorkspace } from "@/workspace/WorkspaceProvider";
import {
  AGENDA_ITEM,
  CREATE_ITEMS,
  MANAGEMENT_ITEMS,
  PROJECTS_ITEMS,
  PROJECTS_ROOT,
  USER_ITEMS,
  filterMenuByPermission,
  type MenuItemDef,
} from "@/lib/agencyAdminMenu";
import { AgencyAdminSidebarView } from "./AgencyAdminSidebarView";
import { QuickAddClientDialog } from "@/components/crm/QuickAddClientDialog";

export { useSidebarCollapsed } from "./useSidebarCollapsed";

export function AgencyAdminSidebar({
  info,
  collapsed = false,
  onToggle,
  onNavigate,
}: {
  info: AgencyAdminPortalInfo;
  collapsed?: boolean;
  onToggle?: () => void;
  onNavigate?: () => void;
}) {
  const { user, signOut } = useAuth();
  const { can } = usePermissions();
  const { member, accessProfile } = useTeamSession();
  const workspace = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();
  const agencyName = agencyDisplayName(info);
  const logoUrl = resolveAgencyLogoUrl(info);

  const [newClientOpen, setNewClientOpen] = useState(false);

  const openOrActivate = useCallback(
    (item: MenuItemDef) => {
      if (item.action === "new-client") {
        setNewClientOpen(true);
        onNavigate?.();
        return;
      }
      if (workspace) workspace.openOrActivateTab(item.to, item.label);
      else navigate(item.to);
      onNavigate?.();
    },
    [navigate, onNavigate, workspace],
  );

  const { data: profile } = useQuery({
    queryKey: ["agency-admin-profile", user?.id],
    enabled: !!user?.id,
    /* Nome/foto do rodapé precisam refletir a edição do perfil imediatamente. */
    staleTime: 0,
    refetchOnMount: "always",
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data as { name: string | null; avatar_url: string | null } | null;
    },
  });

  /** Nome oficial: perfil salvo → sessão de equipe → fallback pelo e-mail. */
  const emailFallback = (user?.email ?? "").split("@")[0].replace(/[._-]+/g, " ").trim();
  const fullName =
    profile?.name?.trim() || member?.full_name?.trim() || emailFallback || "Usuário";
  const roleLabel = member?.role_title?.trim() || accessProfile?.name?.trim() || "Administrador";

  const isProjectsArea =
    location.pathname === PROJECTS_ROOT || location.pathname === "/meus-projetos";

  const handleSignOut = useCallback(() => {
    void (async () => {
      await signOut();
      navigate(AGENCY_ADMIN_LOGIN, { replace: true });
    })();
  }, [navigate, signOut]);

  const isActive = (item: MenuItemDef) =>
    item.match ? item.match(location.pathname, location.search) : location.pathname === item.to;

  return (
    <>
    <AgencyAdminSidebarView
      agencyName={agencyName}
      logoUrl={logoUrl}
      homeTo={AGENCY_ADMIN_HOME}
      createItems={filterMenuByPermission(CREATE_ITEMS, can)}
      projectsItems={PROJECTS_ITEMS}
      agendaItem={AGENDA_ITEM}
      managementItems={filterMenuByPermission(MANAGEMENT_ITEMS, can)}
      userItems={USER_ITEMS}
      projectsTo={PROJECTS_ROOT}
      projectsActive={isProjectsArea}
      collapsed={collapsed}
      onToggle={onToggle}
      onNavigate={onNavigate}
      hrefFor={(item) => item.to}
      isActive={isActive}
      onActivate={openOrActivate}
      user={{
        fullName,
        roleLabel,
        avatarUrl: profile?.avatar_url || member?.avatar_url || undefined,
        initials: getPersonInitials(fullName),
      }}
      onSignOut={handleSignOut}
      menuResetKey={`${location.pathname}${location.search}|${workspace?.activeId ?? ""}`}
    />
    <QuickAddClientDialog open={newClientOpen} onOpenChange={setNewClientOpen} />
    </>
  );
}
