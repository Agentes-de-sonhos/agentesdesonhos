import { useState, useMemo } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Map,
  Newspaper,
  User,
  Cloud,
  LogOut,
  Shield,
  Megaphone,
  Plane,
  Users,
  GraduationCap,
  Lock,
  Calculator,
  Heart,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  MessageCircleQuestion,
  Store,
  CreditCard,
  Wallet,
  Home,
  BookOpen,
  Compass,
  CalendarDays,
  BookMarked,
  Tag,
  ShoppingCart,
  PlusCircle,
  FileText,
  Route,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useGamification } from "@/hooks/useGamification";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useUserRole } from "@/hooks/useUserRole";
import { useSubscription } from "@/hooks/useSubscription";
import { Feature } from "@/types/subscription";
import { UpgradeDialog } from "@/components/subscription/UpgradeDialog";
import { ComingSoonDialog } from "@/components/subscription/ComingSoonDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  requiredFeature?: Feature;
  isPremium?: boolean;
  isHighlighted?: boolean;
  key?: string;
}

interface MenuSection {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: MenuItem[];
}

const conhecimentoSection: MenuSection = {
  title: "Conhecimento",
  icon: BookOpen,
  items: [
    { title: "EducaTravel Academy", url: "/educa-academy", icon: GraduationCap },
    { title: "Notícias do Trade", url: "/noticias", icon: Newspaper, requiredFeature: "news" },
    { title: "Pergunte e Responda", url: "/perguntas-respostas", icon: MessageCircleQuestion, requiredFeature: "qa_forum" },
  ],
};

const guiasSection: MenuSection = {
  title: "Guias e Referências",
  icon: BookMarked,
  items: [
    { title: "Mapa do Turismo", url: "/mapa-turismo", icon: Map, requiredFeature: "tourism_map" },
    { title: "Travel Advisor", url: "/dream-advisor", icon: Compass },
    { title: "Benefícios e Descontos", url: "/comunidade", icon: Tag, requiredFeature: "community" },
    { title: "Minha Agenda", url: "/agenda", icon: CalendarDays },
  ],
};

const recursosVendasSection: MenuSection = {
  title: "Recursos de Vendas",
  icon: ShoppingCart,
  items: [
    { title: "Bloqueios Aéreos", url: "/bloqueios-aereos", icon: Plane },
    { title: "Materiais de Divulgação", url: "/materiais", icon: Megaphone, requiredFeature: "materials" },
  ],
};

const criarSection: MenuSection = {
  title: "Criar",
  icon: PlusCircle,
  items: [
    { title: "Orçamento", url: "/ferramentas-ia/gerar-orcamento", icon: Calculator, requiredFeature: "quote_generator", isHighlighted: true, isPremium: true },
    { title: "Roteiros", url: "/ferramentas-ia/criar-roteiro", icon: Route, requiredFeature: "ai_tools", isPremium: true },
    { title: "Conteúdo", url: "/ferramentas-ia/criar-conteudo", icon: FileText, requiredFeature: "ai_tools", isPremium: true },
  ],
};

const clientesSection: MenuSection = {
  title: "Clientes",
  icon: Users,
  items: [
    { title: "Gestão de Clientes", url: "/gestao-clientes/clientes", icon: Users, requiredFeature: "crm_basic", isPremium: true },
    { title: "Carteira Digital", url: "/ferramentas-ia/trip-wallet", icon: Wallet, isPremium: true },
  ],
};

const marketingSection: MenuSection = {
  title: "Marketing",
  icon: Megaphone,
  items: [
    { title: "Cartão de Visitas", url: "/meu-cartao", icon: CreditCard, isPremium: true },
    { title: "Vitrine Virtual", url: "/minha-vitrine", icon: Store, isPremium: true },
  ],
};

const comunidadeSection: MenuSection = {
  title: "Comunidade",
  icon: Heart,
  items: [
    { title: "Mentorias", url: "/mentorias", icon: GraduationCap, isPremium: true },
  ],
};

const dashboardItem: MenuItem = { title: "Início", url: "/dashboard", icon: Home };
const profileMenuItem: MenuItem = { title: "Perfil", url: "/perfil", icon: User };
const adminMenuItem: MenuItem = { title: "Administração", url: "/admin", icon: Shield };

export function MobileSidebar() {
  const [expanded, setExpanded] = useState(false);
  const [upgradeFeature, setUpgradeFeature] = useState<Feature | null>(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { isAdmin } = useUserRole();
  const { hasFeature, plan } = useSubscription();
  const { trackSectionVisit } = useGamification();

  const isEducaPass = plan === "educa_pass";

  const allSections: MenuSection[] = useMemo(
    () => [conhecimentoSection, guiasSection, recursosVendasSection, criarSection, clientesSection, marketingSection, comunidadeSection],
    []
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const isSectionActive = (section: MenuSection) =>
    section.items.some((i) => location.pathname === i.url || location.pathname.startsWith(i.url));

  const handleMenuClick = (item: MenuItem, e: React.MouseEvent) => {
    // Educa Pass: only allow EducaTravel Academy
    if (isEducaPass && item.url !== "/educa-academy") {
      e.preventDefault();
      setShowComingSoon(true);
      return;
    }
    if (item.requiredFeature && !hasFeature(item.requiredFeature)) {
      e.preventDefault();
      setUpgradeFeature(item.requiredFeature);
      return;
    }
    trackSectionVisit(item.url);
    setExpanded(false);
    navigate(item.url);
  };

  const handleSignOut = () => {
    setExpanded(false);
    signOut();
  };

  const renderMenuItem = (item: MenuItem) => {
    const isActive =
      location.pathname === item.url ||
      (item.url === "/dashboard" && location.pathname === "/");
    const isLockedByPlan = item.requiredFeature && !hasFeature(item.requiredFeature);
    const isLockedByEducaPass = isEducaPass && item.url !== "/educa-academy";
    const isLocked = isLockedByPlan || isLockedByEducaPass;

    const iconElement = (
      <div className="relative flex-shrink-0">
        <item.icon
          className={cn(
            "h-5 w-5 transition-colors",
            isActive && !isLocked ? "text-primary-foreground" : "",
            isLocked && !isLockedByEducaPass ? "text-muted-foreground" : ""
          )}
        />
        {isLocked && !isLockedByEducaPass && (
          <Lock className="h-2.5 w-2.5 absolute -top-1 -right-1 text-warning" />
        )}
      </div>
    );

    if (!expanded) {
      return (
        <Tooltip key={item.url}>
          <TooltipTrigger asChild>
            <button
              onClick={(e) => handleMenuClick(item, e)}
              className={cn(
                "w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-200",
                isActive && !isLocked
                  ? "bg-primary text-primary-foreground shadow-md"
                  : (isLocked && !isLockedByEducaPass)
                    ? "opacity-50"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
              )}
            >
              {iconElement}
            </button>
          </TooltipTrigger>
          <TooltipContent side="right" sideOffset={8}>
            <p className="text-sm font-medium">{item.title}</p>
            {item.isPremium && <p className="text-xs text-warning">Premium</p>}
          </TooltipContent>
        </Tooltip>
      );
    }

    return (
      <button
        key={item.url}
        onClick={(e) => handleMenuClick(item, e)}
        className={cn(
          "w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 text-left",
          isActive && !isLocked
            ? "bg-primary text-primary-foreground shadow-md"
            : (isLocked && !isLockedByEducaPass)
              ? "opacity-60"
              : isLockedByEducaPass
                ? "text-sidebar-foreground hover:bg-sidebar-accent"
                : "text-sidebar-foreground hover:bg-sidebar-accent",
          item.isHighlighted && !isActive && !isLocked && "ring-1 ring-primary/40 bg-primary/5"
        )}
      >
        {iconElement}
        <span className={cn("truncate flex-1", isLocked && !isLockedByEducaPass && "text-muted-foreground")}>
          {item.title}
        </span>
        {item.isPremium && (
          <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-warning/50 text-warning font-semibold flex-shrink-0">
            PRO
          </Badge>
        )}
        {item.isHighlighted && !isActive && !isLocked && (
          <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0 animate-pulse" />
        )}
      </button>
    );
  };

  const renderSection = (section: MenuSection) => {
    const isActive = isSectionActive(section);
    const isOpen = openSections[section.title] ?? isActive;
    const Icon = section.icon;

    if (!expanded) {
      return (
        <nav key={section.title} className="flex flex-col items-center gap-1 px-2">
          {section.items.map((item) => renderMenuItem(item))}
        </nav>
      );
    }

    return (
      <div key={section.title} className="px-3">
        <button
          onClick={() => toggleSection(section.title)}
          className="w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50 transition-all duration-200"
        >
          <Icon className="h-4 w-4 text-muted-foreground" />
          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 flex-1 text-left">
            {section.title}
          </span>
          <ChevronDown
            className={cn(
              "h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        </button>
        {isOpen && (
          <nav className="flex flex-col gap-0.5 mt-0.5 animate-fade-in">
            {section.items.map((item) => renderMenuItem(item))}
          </nav>
        )}
      </div>
    );
  };

  return (
    <TooltipProvider delayDuration={100}>
      {expanded && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden animate-fade-in"
          onClick={() => setExpanded(false)}
        />
      )}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-screen border-r border-sidebar-border bg-sidebar flex flex-col lg:hidden transition-all duration-300 ease-out",
          expanded ? "w-[280px] shadow-2xl" : "w-14"
        )}
      >
        {/* Header */}
        <div
          className={cn(
            "flex items-center border-b border-sidebar-border flex-shrink-0 transition-all duration-300",
            expanded ? "h-16 px-4 justify-between" : "h-14 justify-center"
          )}
        >
          {expanded ? (
            <>
              <Link to="/dashboard" onClick={() => setExpanded(false)} className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl gradient-primary">
                  <Cloud className="h-5 w-5 text-primary-foreground" />
                </div>
                <h1 className="font-display text-lg font-semibold text-sidebar-foreground animate-fade-in">
                  Agentes de Sonhos
                </h1>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-sidebar-foreground"
                onClick={() => setExpanded(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-muted-foreground hover:text-sidebar-foreground"
              onClick={() => setExpanded(true)}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* Scrollable Navigation */}
        <div className="flex-1 overflow-y-auto py-3 space-y-1">
          {/* Início */}
          <nav
            className={cn(
              "flex flex-col",
              expanded ? "gap-0.5 px-3" : "items-center gap-1 px-2"
            )}
          >
            {renderMenuItem(dashboardItem)}
          </nav>

          <div className={cn("py-2", expanded ? "px-3" : "px-2")}>
            <Separator className="bg-sidebar-border" />
          </div>

          {/* All sections */}
          {allSections.map((section) => renderSection(section))}
        </div>

        {/* Bottom Section - Conta */}
        <div
          className={cn(
            "flex-shrink-0 border-t border-sidebar-border space-y-1",
            expanded ? "p-3" : "p-2 flex flex-col items-center"
          )}
        >
          {expanded && (
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 px-3 pb-1">
              Conta
            </p>
          )}

          {isAdmin && renderMenuItem(adminMenuItem)}
          {renderMenuItem(profileMenuItem)}

          {/* Logout */}
          {expanded ? (
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
              onClick={handleSignOut}
            >
              <LogOut className="h-5 w-5 flex-shrink-0" />
              <span>Sair</span>
            </Button>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right">
                <p>Sair</p>
              </TooltipContent>
            </Tooltip>
          )}

          {expanded && (
            <div className="text-center pt-2">
              <p className="text-[10px] text-muted-foreground/60">Desenvolvido por</p>
              <p className="text-[11px] font-medium text-muted-foreground/80">Nobre Digital</p>
            </div>
          )}
        </div>
      </aside>

      <UpgradeDialog
        open={upgradeFeature !== null}
        onOpenChange={(open) => !open && setUpgradeFeature(null)}
        requiredFeature={upgradeFeature || undefined}
      />
      <ComingSoonDialog
        open={showComingSoon}
        onOpenChange={setShowComingSoon}
      />
    </TooltipProvider>
  );
}
