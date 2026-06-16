import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, DollarSign, LayoutDashboard, ArrowDownCircle,
  ShoppingBag, ArrowUpCircle, Receipt, Users,
  ChevronLeft, ChevronRight, Calendar, FileText, Truck,
  MoreHorizontal,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamMembersDialog } from "@/components/team/TeamMembersDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";
import { useIsTeamMember } from "@/contexts/TeamSessionContext";
import { Button } from "@/components/ui/button";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { SmartDashboard } from "@/components/financial/SmartDashboard";
import { SmartExpenseManager } from "@/components/financial/SmartExpenseManager";
import { SalesManager } from "@/components/financial/SalesManager";
import { EntradasManager } from "@/components/financial/EntradasManager";
import { CommissionsCenter } from "@/components/financial/commissions/CommissionsCenter";
import { SellersManager } from "@/components/financial/SellersManager";
import { SellersCommissionReport } from "@/components/financial/SellersCommissionReport";
import { InvoicesManager } from "@/components/financial/invoices/InvoicesManager";
import { SuppliersManager } from "@/components/financial/SuppliersManager";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const ALL_TABS_DEF = [
  { key: "dashboard", label: "Visão Geral", icon: LayoutDashboard },
  { key: "vendas", label: "Vendas", icon: ShoppingBag },
  { key: "entradas", label: "Entradas", icon: ArrowUpCircle },
  { key: "despesas", label: "Despesas", icon: ArrowDownCircle },
  { key: "faturas", label: "Faturas", icon: FileText },
  { key: "comissoes", label: "Comissões", icon: Receipt },
  { key: "fornecedores", label: "Fornecedores", icon: Truck },
  { key: "vendedores", label: "Vendedores", icon: Users },
] as const;

const ALL_TABS = ALL_TABS_DEF.map(t => t.key);

type PeriodPreset = "this_month" | "last_month" | "last_3_months";

function getPeriodBounds(preset: PeriodPreset) {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-indexed

  if (preset === "this_month") {
    return {
      start: new Date(y, m, 1),
      end: new Date(y, m + 1, 0),
      label: `${MONTH_NAMES[m + 1]} ${y}`,
    };
  }
  if (preset === "last_month") {
    const d = new Date(y, m - 1, 1);
    return {
      start: d,
      end: new Date(d.getFullYear(), d.getMonth() + 1, 0),
      label: `${MONTH_NAMES[d.getMonth() + 1]} ${d.getFullYear()}`,
    };
  }
  // last_3_months
  const d = new Date(y, m - 2, 1);
  return {
    start: d,
    end: new Date(y, m + 1, 0),
    label: `${MONTH_NAMES[d.getMonth() + 1]}/${d.getFullYear()} — ${MONTH_NAMES[m + 1]}/${y}`,
  };
}

export default function Financeiro() {
  const { isLoading } = useFinancial();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = ALL_TABS.includes(tabParam as any) ? tabParam! : "dashboard";
  const { user } = useAuth();
  const isTeam = useIsTeamMember();
  const { can } = usePermissions();
  const navigate = useNavigate();
  const canShowTeamMembers = !!user && !isTeam;
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  // Bloqueio total para team member sem financial.access
  const hasFinancialAccess = can('financial.access');
  useEffect(() => {
    if (isTeam && !hasFinancialAccess) {
      navigate('/gestao-clientes/clientes', { replace: true });
    }
  }, [isTeam, hasFinancialAccess, navigate]);

  // Global period state — month navigator
  const now = new Date();
  const [viewMonth, setViewMonth] = useState(now.getMonth() + 1);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const isCurrentMonth = viewMonth === now.getMonth() + 1 && viewYear === now.getFullYear();

  const goToPrevMonth = () => {
    if (viewMonth === 1) { setViewMonth(12); setViewYear(viewYear - 1); }
    else setViewMonth(viewMonth - 1);
  };
  const goToNextMonth = () => {
    if (viewMonth === 12) { setViewMonth(1); setViewYear(viewYear + 1); }
    else setViewMonth(viewMonth + 1);
  };
  const goToCurrentMonth = () => {
    setViewMonth(now.getMonth() + 1);
    setViewYear(now.getFullYear());
  };

  const periodLabel = `${MONTH_NAMES[viewMonth]} ${viewYear}`;

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  const showPeriodSelector = true;

  const tabClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  const PRIMARY_TAB_KEYS = ["dashboard", "vendas", "entradas", "despesas"];
  const MORE_TAB_KEYS = ["vendedores", "comissoes", "faturas", "fornecedores"];

  const primaryTabs = ALL_TABS_DEF.filter(tab => PRIMARY_TAB_KEYS.includes(tab.key));
  const moreTabs = MORE_TAB_KEYS.map(key => ALL_TABS_DEF.find(tab => tab.key === key)!).filter(Boolean);
  const isMoreActive = MORE_TAB_KEYS.includes(activeTab);

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in relative">
        <PermissionGate permission="financial.access">
        <div className="relative">
          <PageHeader
            pageKey="financeiro"
            title="Gestão Financeira"
            subtitle="Controle simples e inteligente da sua agência"
            icon={DollarSign}
          />


          {showPeriodSelector && (
            <div className="mt-3 flex flex-wrap items-center gap-2 md:mt-0 md:absolute md:top-0 md:right-0">
              <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-transparent hover:text-foreground" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[120px] md:min-w-[140px]">
                <span className="text-sm font-semibold">{periodLabel}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8 hover:bg-transparent hover:text-foreground" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentMonth && (
                <Button variant="ghost" size="sm" className="text-xs gap-1 hover:bg-transparent" onClick={goToCurrentMonth}>
                  <Calendar className="h-3 w-3" />
                  Hoje
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-1 flex-wrap">
              {primaryTabs.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    onClick={() => handleTabChange(tab.key)}
                    className={tabClass(isActive)}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{tab.label}</span>
                  </button>
                );
              })}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={tabClass(isMoreActive)}>
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="hidden sm:inline">Mais</span>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="min-w-[12rem]">
                  {moreTabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.key;
                    return (
                      <DropdownMenuItem
                        key={tab.key}
                        onClick={() => handleTabChange(tab.key)}
                        className={cn(
                          "flex items-center gap-2 cursor-pointer",
                          isActive && "bg-accent text-accent-foreground"
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{tab.label}</span>
                      </DropdownMenuItem>
                    );
                  })}
                  {canShowTeamMembers && (
                    <DropdownMenuItem
                      onClick={() => setTeamDialogOpen(true)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      <Users className="h-4 w-4" />
                      <span>Usuários da Equipe</span>
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div>
              {activeTab === "dashboard" && (
                <SmartDashboard viewMonth={viewMonth} viewYear={viewYear} />
              )}
              {activeTab === "entradas" && <EntradasManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "despesas" && <SmartExpenseManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "faturas" && <InvoicesManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "vendas" && <SalesManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "comissoes" && <CommissionsCenter viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "fornecedores" && <SuppliersManager />}
              {activeTab === "vendedores" && (
                <div className="space-y-8">
                  <SellersManager />
                  <SellersCommissionReport viewMonth={viewMonth} viewYear={viewYear} />
                </div>
              )}
            </div>
          </div>
        )}
        {canShowTeamMembers && (
          <TeamMembersDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} />
        )}
        </PermissionGate>
      </div>
    </DashboardLayout>
  );
}
