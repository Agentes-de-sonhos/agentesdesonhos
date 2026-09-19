import { Fragment, useCallback, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, Cloud, Lock, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { ComingSoonDialog } from "@/components/subscription/ComingSoonDialog";
import { AppSidebarAccount } from "./AppSidebarAccount";
import { useAuth } from "@/hooks/useAuth";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermissions } from "@/hooks/usePermissions";
import { canAccessRoute } from "@/lib/routePermissions";
import { isItemHiddenForUser } from "@/lib/sidebarVisibility";
import { SIDEBAR_ROW_CLASS, SIDEBAR_ROW_GAP_CLASS } from "@/lib/sidebarAnchor";
import {
  APP_AGENDA_ITEM,
  APP_CREATE_GROUP,
  APP_MANAGEMENT_ITEMS,
  APP_MORE_GROUP,
  APP_OTHER_ITEMS,
  APP_PROJECTS_GROUP,
  type AppSidebarGroup,
  type AppSidebarItem,
} from "@/lib/appSidebarMenu";
import type { Feature } from "@/types/subscription";

const ADMIN_ITEM: AppSidebarItem = { key: "admin", title: "Administração", url: "/admin", icon: Shield };
const CARTAO_ALLOWED = new Set(["/meu-cartao", "/perfil", "/dashboard", "/mentorias"]);
const START_LOCKED = new Set(["/beneficios"]);

export function AppSidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean | undefined>>({});
  const [accountOpen, setAccountOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const location = useLocation();
  const { user, signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan, isPromotor } = useSubscription();
  const { can, isTeamMember } = usePermissions();
  const { trackSectionVisit } = useGamificationLite();
  const collapseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const expandTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pointerInsideRef = useRef(false);

  const isEducaPass = !isPromotor && plan === "educa_pass";
  const isCartaoDigital = !isPromotor && plan === "cartao_digital";
  const isStartPlan = !isPromotor && plan === "start";

  const clearTimers = useCallback(() => {
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    if (expandTimerRef.current) clearTimeout(expandTimerRef.current);
    collapseTimerRef.current = null;
    expandTimerRef.current = null;
  }, []);

  const expandNow = useCallback(() => {
    clearTimers();
    setCollapsed(false);
  }, [clearTimers]);

  const handleSidebarMouseEnter = () => {
    pointerInsideRef.current = true;
    clearTimers();
    if (collapsed) expandTimerRef.current = setTimeout(() => setCollapsed(false), 700);
  };

  const handleSidebarMouseLeave = () => {
    pointerInsideRef.current = false;
    clearTimers();
    if (!accountOpen) collapseTimerRef.current = setTimeout(() => setCollapsed(true), 300);
  };

  const handleAccountOpenChange = (open: boolean) => {
    setAccountOpen(open);
    clearTimers();
    if (!open && !pointerInsideRef.current) {
      collapseTimerRef.current = setTimeout(() => setCollapsed(true), 300);
    }
  };

  const isPermitted = useCallback((item: AppSidebarItem) => {
    if (isItemHiddenForUser(item.key, isAdmin, plan)) return false;
    if (!isTeamMember) return true;
    if (item.anyPermission?.length) return item.anyPermission.some(can);
    if (item.requiredPermission) return can(item.requiredPermission);
    return canAccessRoute(item.url.split("?")[0], can);
  }, [can, isAdmin, isTeamMember, plan]);

  const filterGroup = useCallback((group: AppSidebarGroup): AppSidebarGroup => ({
    ...group,
    items: group.items.filter(isPermitted),
  }), [isPermitted]);

  const createGroup = useMemo(() => filterGroup(APP_CREATE_GROUP), [filterGroup]);
  const projectsGroup = useMemo(() => filterGroup(APP_PROJECTS_GROUP), [filterGroup]);
  const moreGroup = useMemo(() => filterGroup(APP_MORE_GROUP), [filterGroup]);
  const managementItems = useMemo(() => APP_MANAGEMENT_ITEMS.filter(isPermitted), [isPermitted]);
  const otherItems = useMemo(() => APP_OTHER_ITEMS.filter(isPermitted), [isPermitted]);

  const isItemActive = (item: AppSidebarItem) => {
    const [pathname, query] = item.url.split("?");
    if (query) return location.pathname === pathname && location.search === `?${query}`;
    if (item.exactUrl) return location.pathname === pathname;
    return location.pathname === pathname || location.pathname.startsWith(`${pathname}/`) || Boolean(item.activePrefix && location.pathname.startsWith(item.activePrefix));
  };

  const isLocked = (item: AppSidebarItem) =>
    Boolean(item.requiredFeature && !hasFeature(item.requiredFeature)) ||
    (isEducaPass && item.url !== "/educa-academy") ||
    (isCartaoDigital && !CARTAO_ALLOWED.has(item.url)) ||
    (isStartPlan && START_LOCKED.has(item.url));

  const handleItemClick = (item: AppSidebarItem, event: React.MouseEvent) => {
    if (collapsed) {
      event.preventDefault();
      expandNow();
      return;
    }
    if (isEducaPass && item.url !== "/educa-academy") {
      event.preventDefault();
      setShowComingSoon(true);
      return;
    }
    if (isCartaoDigital && !CARTAO_ALLOWED.has(item.url)) {
      event.preventDefault();
      setShowComingSoon(true);
      return;
    }
    if (isStartPlan && START_LOCKED.has(item.url)) {
      event.preventDefault();
      setUpgradeFeature(item.requiredFeature ?? "crm_basic");
      return;
    }
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      event.preventDefault();
      setUpgradeFeature(item.requiredFeature);
      return;
    }
    trackSectionVisit(item.url);
    setCollapsed(true);
  };

  const renderItem = (item: AppSidebarItem, nested = false) => {
    const active = isItemActive(item);
    const locked = isLocked(item);
    return (
      <Link
        key={item.key}
        to={locked ? "#" : item.url}
        aria-label={collapsed ? item.title : undefined}
        aria-current={active ? "page" : undefined}
        data-workspace-title={item.title}
        data-sidebar-row={item.key}
        onClick={(event) => handleItemClick(item, event)}
        className={cn(
          "group rounded-xl px-3 text-sm font-medium transition-[width,background-color,color] duration-300",
          SIDEBAR_ROW_CLASS,
          collapsed
            ? cn("text-sidebar-foreground", locked && "opacity-60")
            : active && !locked
              ? "bg-sidebar-accent text-sidebar-foreground font-semibold"
              : locked
                ? "cursor-pointer text-muted-foreground opacity-60"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
          nested && !collapsed && "text-[13px]",
        )}
      >
        <span className="relative shrink-0">
          <item.icon className="h-5 w-5" />
          {locked && <Lock className="absolute -right-1 -top-1 h-2.5 w-2.5 text-warning" />}
        </span>
        {!collapsed && <span className="min-w-0 flex-1 truncate">{item.title}</span>}
      </Link>
    );
  };

  const renderGroup = (group: AppSidebarGroup) => {
    if (group.items.length === 0) return null;
    const childActive = group.items.some(isItemActive);
    const open = openGroups[group.key] ?? childActive;
    const contentId = `app-sidebar-${group.key}`;
    return (
      <div key={group.key} className="flex flex-col">
        <Button
          type="button"
          variant={group.emphasis ? "default" : "ghost"}
          aria-label={collapsed ? group.title : undefined}
          aria-expanded={open}
          aria-controls={contentId}
          data-sidebar-row={group.key}
          onClick={() => collapsed ? expandNow() : setOpenGroups((prev) => ({ ...prev, [group.key]: !open }))}
          className={cn(
            "h-auto w-full rounded-xl px-3 text-sm",
            SIDEBAR_ROW_CLASS,
            collapsed ? "justify-center" : "justify-start gap-3",
            !group.emphasis && childActive && "bg-sidebar-accent font-semibold",
          )}
        >
          <group.icon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="min-w-0 flex-1 truncate text-left">{group.title}</span>
              {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </>
          )}
        </Button>
        {open && !collapsed && (
          <nav id={contentId} aria-label={group.title} className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">
            {group.items.map((item) => renderItem(item, true))}
          </nav>
        )}
      </div>
    );
  };

  const sectionLabel = (label: string) => collapsed ? (
    <Separator className="mx-auto my-1 w-7 bg-sidebar-border" />
  ) : (
    <p className="px-3 pt-2 text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <aside
        id="app-sidebar"
        className={cn("fixed left-0 top-0 z-40 hidden h-screen flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300 lg:flex", collapsed ? "w-16" : "w-72")}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
        onFocusCapture={expandNow}
      >
        <div className="flex h-16 shrink-0 items-center border-b border-sidebar-border px-4">
          <Link to={isStartPlan ? "/dashboard-start" : "/dashboard"} data-workspace-title="Inicial" className="flex min-w-0 items-center gap-3">
            <div className="gradient-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-xl">
              <Cloud className="h-5 w-5 text-primary-foreground" />
            </div>
            {!collapsed && <h1 className="whitespace-nowrap font-display text-base font-semibold text-sidebar-foreground">Agentes de Sonhos</h1>}
          </Link>
        </div>

        <div className={cn("flex-1 space-y-0.5 overflow-y-auto overflow-x-hidden py-2", collapsed && "scrollbar-hide")}>
          <nav className={cn("flex flex-col px-3", SIDEBAR_ROW_GAP_CLASS)}>{renderGroup(createGroup)}</nav>
          <div className="px-3">{sectionLabel("MEU TRABALHO")}</div>
          <nav className={cn("flex flex-col px-3", SIDEBAR_ROW_GAP_CLASS)}>
            {renderGroup(projectsGroup)}
            {isPermitted(APP_AGENDA_ITEM) && renderItem(APP_AGENDA_ITEM)}
          </nav>
          <div className="px-3">{sectionLabel("GESTÃO")}</div>
          <nav className={cn("flex flex-col px-3", SIDEBAR_ROW_GAP_CLASS)}>{managementItems.map((item) => renderItem(item))}</nav>
          <div className="px-3">{sectionLabel("OUTRAS")}</div>
          <nav className={cn("flex flex-col px-3", SIDEBAR_ROW_GAP_CLASS)}>
            {otherItems.map((item) => renderItem(item))}
            {renderGroup(moreGroup)}
          </nav>
        </div>

        <div className="shrink-0 border-t border-sidebar-border px-3 py-2">
          {isAdmin && <div className="mb-1">{renderItem(ADMIN_ITEM)}</div>}
          <AppSidebarAccount collapsed={collapsed} open={accountOpen} onOpenChange={handleAccountOpenChange} onSignOut={() => void signOut()} />
        </div>
      </aside>
      <UpgradeDialog open={upgradeFeature !== null} onOpenChange={(open) => !open && setUpgradeFeature(null)} requiredFeature={upgradeFeature || undefined} />
      <ComingSoonDialog open={showComingSoon} onOpenChange={setShowComingSoon} />
    </TooltipProvider>
  );
}
