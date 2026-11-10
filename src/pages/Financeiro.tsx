import { useState, type CSSProperties } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, DollarSign, LayoutDashboard, ArrowDownCircle,
  ShoppingBag, ArrowUpCircle, Receipt, Users,
  ChevronLeft, ChevronRight, Calendar, FileText, Truck,
  ReceiptText, FileSpreadsheet, FileSignature,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { FiscalNotesTab } from "@/components/financial/commissions/FiscalNotesTab";
import { ReceiptsCenter } from "@/components/financial/receipts/ReceiptsCenter";
import { ContractsCenter } from "@/components/financial/contracts/ContractsCenter";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAdminNav } from "@/lib/agencyAdminNav";

function Tip({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="bottom" className="2xl:hidden font-medium">{label}</TooltipContent>
    </Tooltip>
  );
}

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Abas superiores (ordem exata). "Visão Geral" fica ao lado do seletor de mês. */
const ALL_TABS_DEF = [
  { key: "vendas", label: "Vendas", icon: ShoppingBag },
  { key: "entradas", label: "Entradas", icon: ArrowUpCircle },
  { key: "despesas", label: "Despesas", icon: ArrowDownCircle },
  { key: "comissoes", label: "Comissões", icon: Receipt },
  { key: "notas-fiscais", label: "Notas Fiscais", icon: FileSpreadsheet },
  { key: "fornecedores", label: "Fornecedores", icon: Truck },
  { key: "vendedores", label: "Vendedores", icon: Users, more: true },
  { key: "recibos", label: "Recibos", icon: ReceiptText, more: true },
  { key: "faturas", label: "Faturas", icon: FileText, more: true },
  { key: "contratos", label: "Contratos", icon: FileSignature, more: true },
] as const;
const MAIN_TABS = ALL_TABS_DEF.filter(t => !("more" in t));
const MORE_TABS = ALL_TABS_DEF.filter(t => "more" in t);

const ALL_TABS = ["dashboard", ...ALL_TABS_DEF.map(t => t.key)];


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
  const nav = useAdminNav();

  // Bloqueio total para team member sem financial.access
  const hasFinancialAccess = can('financial.access');
  useEffect(() => {
    if (isTeam && !hasFinancialAccess) {
      navigate(nav.crm('clientes'), { replace: true });
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
  const [showMore, setShowMore] = useState(false);
  const [toolbarEl, setToolbarEl] = useState<HTMLDivElement | null>(null);
  const periodShort = `${MONTH_NAMES[viewMonth].slice(0, 3)}/${String(viewYear).slice(-2)}`;

  const TAB_COLOR: Record<string, string> = {
    dashboard: "--fin-dashboard", vendas: "--fin-vendas", entradas: "--fin-entradas",
    despesas: "--fin-despesas", comissoes: "--fin-comissoes", "notas-fiscais": "--fin-notas",
    fornecedores: "--fin-fornecedores",
  };
  const tabStyle = (key: string, isActive: boolean): CSSProperties => {
    const v = `var(${TAB_COLOR[key] ?? "--fin-extra"})`;
    return isActive
      ? { backgroundColor: `hsl(${v})`, color: "hsl(var(--primary-foreground))", boxShadow: `0 6px 16px -6px hsl(${v} / 0.6)` }
      : { backgroundColor: `hsl(${v} / 0.1)`, color: `hsl(${v})` };
  };
  const tabClass = (_isActive: boolean) =>
    "flex h-10 min-w-10 items-center justify-center gap-2 px-2.5 2xl:px-4 rounded-xl text-sm font-semibold transition-all whitespace-nowrap hover:-translate-y-0.5 hover:shadow-md";

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in relative">
        <PermissionGate permission="financial.access">
        <TooltipProvider delayDuration={80}>
        <div className="flex flex-nowrap items-center gap-3">
          <div className="flex min-w-0 shrink items-center gap-2.5">
            <DollarSign className="h-8 w-8 shrink-0 text-primary" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold leading-tight">Gestão Financeira</h1>
              <p className="hidden truncate text-sm text-muted-foreground lg:block">Controle simples da sua agência</p>
            </div>
          </div>

          {showPeriodSelector && (
            <div className="flex shrink-0 items-center gap-2">
              <div className="flex h-10 items-center gap-0.5 rounded-xl border bg-background p-1 shadow-sm">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={goToPrevMonth} aria-label="Mês anterior">
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="whitespace-nowrap px-2 text-center text-sm font-bold text-primary">
                <span className="hidden 2xl:inline">{periodLabel}</span>
                <span className="2xl:hidden">{periodShort}</span>
              </div>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary" onClick={goToNextMonth} aria-label="Próximo mês">
                <ChevronRight className="h-4 w-4" />
              </Button>
              </div>
              {!isCurrentMonth && (
                <Tip label="Voltar para o mês atual">
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToCurrentMonth} aria-label="Hoje">
                    <Calendar className="h-4 w-4" />
                  </Button>
                </Tip>
              )}
              <Tip label="Visão Geral">
                <button
                  className={tabClass(activeTab === "dashboard")}
                  style={tabStyle("dashboard", activeTab === "dashboard")}
                  onClick={() => handleTabChange("dashboard")}
                  aria-label="Visão Geral"
                >
                  <LayoutDashboard className="h-5 w-5 2xl:h-[18px] 2xl:w-[18px]" />
                  <span className="hidden 2xl:inline">Visão Geral</span>
                </button>
              </Tip>
            </div>
          )}

          <div
            className="flex shrink-0 flex-nowrap items-center gap-2"
            role="tablist"
            aria-label="Seções da Gestão Financeira"
          >
            {[...MAIN_TABS, ...MORE_TABS.filter(t => t.key === activeTab)].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <Tip key={tab.key} label={tab.label}>
                  <button
                    role="tab"
                    aria-selected={isActive}
                    aria-label={tab.label}
                    onClick={() => handleTabChange(tab.key)}
                    className={tabClass(isActive)}
                    style={tabStyle(tab.key, isActive)}
                  >
                    <Icon className="h-5 w-5 shrink-0 2xl:h-[18px] 2xl:w-[18px]" />
                    <span className="hidden 2xl:inline">{tab.label}</span>
                  </button>
                </Tip>
              );
            })}
            <DropdownMenu open={showMore} onOpenChange={setShowMore}>
              <Tip label="Mais seções">
                <DropdownMenuTrigger asChild>
                  <button
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-primary/40 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
                    aria-label="Mais seções"
                  >
                    <ChevronRight className={cn("h-5 w-5 transition-transform", showMore && "rotate-90")} />
                  </button>
                </DropdownMenuTrigger>
              </Tip>
              <DropdownMenuContent align="end" className="w-52 p-1.5">
                {MORE_TABS.map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.key;
                  return (
                    <DropdownMenuItem
                      key={tab.key}
                      onClick={() => handleTabChange(tab.key)}
                      className={cn("gap-2.5 rounded-lg py-2 font-medium", isActive && "bg-primary/10 text-primary")}
                    >
                      <Icon className="h-[18px] w-[18px]" />
                      {tab.label}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          <div ref={setToolbarEl} className="ml-auto flex shrink-0 flex-nowrap items-center gap-1.5" />
        </div>
        </TooltipProvider>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              {activeTab === "dashboard" && (
                <SmartDashboard viewMonth={viewMonth} viewYear={viewYear} />
              )}
              {activeTab === "entradas" && <EntradasManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "despesas" && <SmartExpenseManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "faturas" && <InvoicesManager viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "vendas" && <SalesManager toolbarEl={toolbarEl} viewMonth={viewMonth} viewYear={viewYear} onMonthChange={(m, y) => { setViewMonth(m); setViewYear(y); }} />}
              {activeTab === "comissoes" && <CommissionsCenter viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "recibos" && <ReceiptsCenter viewMonth={viewMonth} viewYear={viewYear} />}
              {activeTab === "notas-fiscais" && <FiscalNotesTab />}
              {activeTab === "contratos" && <ContractsCenter />}
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
        </PermissionGate>
      </div>
    </DashboardLayout>
  );
}
