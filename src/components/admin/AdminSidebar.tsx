import { useState } from "react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  Users,
  Mail,
  CalendarDays,
  DollarSign,
  FileText,
  GraduationCap,
  BookOpen,
  Newspaper,
  Menu,
  Megaphone,
  Link2,
  Image,
  Building2,
  Hotel,
  TrendingUp,
  Plane,
  Heart,
  Star,
  Headset,
  BarChart3,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  PanelLeft,
  Gift,
  HardDrive,
  Store,
  CreditCard,
  Eye,
} from "lucide-react";

interface AdminMenuItem {
  id: string;
  label: string;
  icon: React.ElementType;
}

interface AdminMenuGroup {
  title: string;
  items: AdminMenuItem[];
}

const menuGroups: AdminMenuGroup[] = [
  {
    title: "Gestão",
    items: [
      { id: "users", label: "Usuários", icon: Users },
      { id: "crm", label: "CRM", icon: Mail },
      { id: "agenda-events", label: "Agenda", icon: CalendarDays },
      { id: "business-cards", label: "Cartões", icon: CreditCard },
    ],
  },
  {
    title: "Conteúdo",
    items: [
      { id: "materials", label: "Materiais", icon: FileText },
      { id: "vitrine", label: "Vitrine", icon: Store },
      { id: "mentorships", label: "Cursos", icon: GraduationCap },
      { id: "academy", label: "Academy", icon: GraduationCap },
      { id: "playbooks", label: "Playbooks", icon: BookOpen },
      { id: "curadoria", label: "Notícias", icon: Newspaper },
    ],
  },
  {
    title: "Plataforma",
    items: [
      { id: "menu-order", label: "Menu", icon: Menu },
      { id: "popups", label: "Pop-ups", icon: Megaphone },
      { id: "suppliers", label: "Links", icon: Link2 },
      { id: "registration-links", label: "Links Cadastro", icon: Link2 },
      { id: "page-banners", label: "Capas", icon: Image },
    ],
  },
  {
    title: "Comercial",
    items: [
      { id: "trade-suppliers", label: "Diretório", icon: Building2 },
      { id: "hotels", label: "Hotéis", icon: Hotel },
      { id: "trade", label: "Trade", icon: TrendingUp },
      { id: "flight-blocks", label: "Bloqueios", icon: Plane },
      { id: "benefits", label: "Benefícios", icon: Gift },
    ],
  },
  {
    title: "Engajamento",
    items: [
      { id: "community", label: "Comunidade", icon: Heart },
      { id: "feedback", label: "Feedback", icon: Star },
      { id: "tickets", label: "Suporte", icon: Headset },
    ],
  },
  {
    title: "Dados",
    items: [
      { id: "analytics", label: "Analytics", icon: BarChart3 },
      { id: "surveys", label: "Pesquisas", icon: MessageCircle },
      { id: "drive-import", label: "Drive", icon: HardDrive },
      { id: "support-mode", label: "Modo Suporte", icon: Eye },
    ],
  },
];

interface AdminSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

function SidebarContent({
  activeTab,
  onTabChange,
  collapsed,
  onClose,
}: {
  activeTab: string;
  onTabChange: (tab: string) => void;
  collapsed: boolean;
  onClose?: () => void;
}) {
  return (
    <ScrollArea className="h-full">
      <div className="py-3 space-y-4">
        {menuGroups.map((group) => (
          <div key={group.title}>
            {!collapsed && (
              <p className="px-4 mb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                {group.title}
              </p>
            )}
            {collapsed && (
              <div className="mx-auto my-2 h-px w-6 bg-border" />
            )}
            <div className="space-y-0.5 px-2">
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      onClose?.();
                    }}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      "hover:bg-accent hover:text-accent-foreground",
                      isActive
                        ? "bg-primary/10 text-primary border-l-[3px] border-primary pl-[9px]"
                        : "text-muted-foreground",
                      collapsed && "justify-center px-2"
                    )}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ScrollArea>
  );
}

export function AdminSidebar({ activeTab, onTabChange }: AdminSidebarProps) {
  const isMobile = useIsMobile();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Mobile: drawer
  if (isMobile) {
    return (
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetTrigger asChild>
          <Button variant="outline" size="icon" className="fixed bottom-20 left-4 z-40 shadow-lg rounded-full h-10 w-10 lg:hidden">
            <PanelLeft className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0 pt-8">
          <SidebarContent
            activeTab={activeTab}
            onTabChange={onTabChange}
            collapsed={false}
            onClose={() => setMobileOpen(false)}
          />
        </SheetContent>
      </Sheet>
    );
  }

  // Desktop: fixed sidebar
  return (
    <aside
      className={cn(
        "sticky top-0 h-[calc(100vh-2rem)] shrink-0 border-r bg-card rounded-xl transition-all duration-200 hidden lg:flex flex-col",
        collapsed ? "w-14" : "w-56"
      )}
    >
      <div className="flex items-center justify-end p-2">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
      <SidebarContent activeTab={activeTab} onTabChange={onTabChange} collapsed={collapsed} />
    </aside>
  );
}
