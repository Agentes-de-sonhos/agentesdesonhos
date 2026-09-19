import { useCallback, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ChevronDown, ChevronRight, Cloud, Lock, Shield, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { ComingSoonDialog } from "@/components/subscription/ComingSoonDialog";
import { AppSidebarAccount } from "./AppSidebarAccount";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { usePermissions } from "@/hooks/usePermissions";
import { useGamificationLite } from "@/hooks/useGamificationLite";
import { useOpenInternalWindow } from "@/workspace/useOpenInternalWindow";
import { canAccessRoute } from "@/lib/routePermissions";
import { isItemHiddenForUser } from "@/lib/sidebarVisibility";
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

export function MobileDrawerMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean | undefined>>({});
  const [accountOpen, setAccountOpen] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan, isPromotor } = useSubscription();
  const { can, isTeamMember } = usePermissions();
  const { trackSectionVisit } = useGamificationLite();
  const openInternalWindow = useOpenInternalWindow();
  const isEducaPass = !isPromotor && plan === "educa_pass";
  const isCartaoDigital = !isPromotor && plan === "cartao_digital";
  const isStartPlan = !isPromotor && plan === "start";

  const isPermitted = useCallback((item: AppSidebarItem) => {
    if (isItemHiddenForUser(item.key, isAdmin, plan)) return false;
    if (!isTeamMember) return true;
    if (item.anyPermission?.length) return item.anyPermission.some(can);
    if (item.requiredPermission) return can(item.requiredPermission);
    return canAccessRoute(item.url.split("?")[0], can);
  }, [can, isAdmin, isTeamMember, plan]);
  const filtered = useCallback((group: AppSidebarGroup) => ({ ...group, items: group.items.filter(isPermitted) }), [isPermitted]);
  const createGroup = useMemo(() => filtered(APP_CREATE_GROUP), [filtered]);
  const projectsGroup = useMemo(() => filtered(APP_PROJECTS_GROUP), [filtered]);
  const moreGroup = useMemo(() => filtered(APP_MORE_GROUP), [filtered]);
  const management = useMemo(() => APP_MANAGEMENT_ITEMS.filter(isPermitted), [isPermitted]);
  const others = useMemo(() => APP_OTHER_ITEMS.filter(isPermitted), [isPermitted]);

  const isActive = (item: AppSidebarItem) => {
    const [pathname, query] = item.url.split("?");
    if (query) return location.pathname === pathname && location.search === `?${query}`;
    if (item.exactUrl) return location.pathname === pathname;
    return location.pathname === pathname || location.pathname.startsWith(`${pathname}/`) || Boolean(item.activePrefix && location.pathname.startsWith(item.activePrefix));
  };
  const locked = (item: AppSidebarItem) => Boolean(item.requiredFeature && !hasFeature(item.requiredFeature)) || (isEducaPass && item.url !== "/educa-academy") || (isCartaoDigital && !CARTAO_ALLOWED.has(item.url)) || (isStartPlan && START_LOCKED.has(item.url));

  const activate = (item: AppSidebarItem) => {
    if (isEducaPass && item.url !== "/educa-academy") return setShowComingSoon(true);
    if (isCartaoDigital && !CARTAO_ALLOWED.has(item.url)) return setShowComingSoon(true);
    if (isStartPlan && START_LOCKED.has(item.url)) return setUpgradeFeature(item.requiredFeature ?? "crm_basic");
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) return setUpgradeFeature(item.requiredFeature);
    trackSectionVisit(item.url);
    onClose();
    openInternalWindow(item.url, item.title);
  };

  const renderItem = (item: AppSidebarItem, nested = false) => (
    <Button
      key={item.key}
      type="button"
      variant="ghost"
      aria-current={isActive(item) ? "page" : undefined}
      onClick={() => activate(item)}
      className={cn("h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5 text-left", isActive(item) && !locked(item) && "bg-sidebar-accent font-semibold", locked(item) && "opacity-60", nested && "text-[13px]")}
    >
      <span className="relative shrink-0"><item.icon className="h-5 w-5" />{locked(item) && <Lock className="absolute -right-1 -top-1 h-2.5 w-2.5 text-warning" />}</span>
      <span className="min-w-0 flex-1 truncate">{item.title}</span>
    </Button>
  );

  const renderGroup = (group: AppSidebarGroup) => {
    if (!group.items.length) return null;
    const childActive = group.items.some(isActive);
    const expanded = openGroups[group.key] ?? childActive;
    const id = `mobile-menu-${group.key}`;
    return (
      <div key={group.key}>
        <Button type="button" variant={group.emphasis ? "default" : "ghost"} aria-expanded={expanded} aria-controls={id} onClick={() => setOpenGroups((prev) => ({ ...prev, [group.key]: !expanded }))} className="h-auto w-full justify-start gap-3 rounded-lg px-3 py-2.5">
          <group.icon className="h-5 w-5" /><span className="flex-1 truncate text-left">{group.title}</span>{expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </Button>
        {expanded && <nav id={id} aria-label={group.title} className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-sidebar-border pl-2">{group.items.map((item) => renderItem(item, true))}</nav>}
      </div>
    );
  };

  const section = (label: string) => <p className="px-3 pt-3 text-[10px] font-bold uppercase text-muted-foreground">{label}</p>;
  return (
    <>
      {open && <div className="fixed inset-0 z-[60] bg-foreground/40 backdrop-blur-sm lg:hidden" onClick={onClose} />}
      <aside className={cn("fixed right-0 top-0 z-[70] flex h-screen w-[300px] max-w-[85vw] flex-col border-l border-sidebar-border bg-sidebar transition-transform duration-300 lg:hidden", open ? "translate-x-0" : "translate-x-full")}>
        <div className="flex h-16 shrink-0 items-center justify-between border-b border-sidebar-border px-4">
          <div className="flex items-center gap-3"><div className="gradient-primary flex h-9 w-9 items-center justify-center rounded-xl"><Cloud className="h-5 w-5 text-primary-foreground" /></div><h1 className="font-display text-lg font-semibold">Agentes de Sonhos</h1></div>
          <Button variant="ghost" size="icon" aria-label="Fechar menu" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto px-3 py-3">
          {renderGroup(createGroup)}
          {section("MEU TRABALHO")}{renderGroup(projectsGroup)}{isPermitted(APP_AGENDA_ITEM) && renderItem(APP_AGENDA_ITEM)}
          {section("GESTÃO")}{management.map((item) => renderItem(item))}
          {section("OUTRAS")}{others.map((item) => renderItem(item))}{renderGroup(moreGroup)}
        </div>
        <div className="shrink-0 border-t border-sidebar-border p-3">
          {isAdmin && <div className="mb-1">{renderItem(ADMIN_ITEM)}</div>}
          <AppSidebarAccount open={accountOpen} onOpenChange={setAccountOpen} onNavigate={onClose} onSignOut={() => { onClose(); void signOut(); }} />
        </div>
      </aside>
      <UpgradeDialog open={upgradeFeature !== null} onOpenChange={(value) => !value && setUpgradeFeature(null)} requiredFeature={upgradeFeature || undefined} />
      <ComingSoonDialog open={showComingSoon} onOpenChange={setShowComingSoon} />
    </>
  );
}
