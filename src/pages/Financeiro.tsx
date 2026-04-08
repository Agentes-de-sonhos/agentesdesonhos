import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, DollarSign, LayoutDashboard, ArrowDownCircle,
  ShoppingBag, ArrowUpCircle, Receipt, Users, Plus,
  ChevronLeft, ChevronRight, Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import { SmartDashboard } from "@/components/financial/SmartDashboard";
import { SmartExpenseManager } from "@/components/financial/SmartExpenseManager";
import { SalesManager } from "@/components/financial/SalesManager";
import { EntradasManager } from "@/components/financial/EntradasManager";
import { CommissionsReceivable } from "@/components/financial/CommissionsReceivable";
import { SellersManager } from "@/components/financial/SellersManager";
import { useFinancial } from "@/hooks/useFinancial";
import { cn } from "@/lib/utils";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

const FINANCEIRO_TABS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "entradas", label: "Entradas", icon: ArrowUpCircle },
  { key: "despesas", label: "Despesas", icon: ArrowDownCircle },
] as const;

const GESTAO_TABS = [
  { key: "vendas", label: "Vendas", icon: ShoppingBag },
  { key: "comissoes", label: "Comissões", icon: Receipt },
  { key: "vendedores", label: "Vendedores", icon: Users },
] as const;

const ALL_TABS = [...FINANCEIRO_TABS, ...GESTAO_TABS].map(t => t.key);

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

  // Open new sale dialog by switching to vendas tab with a flag
  const handleNewSale = () => {
    setSearchParams({ tab: "vendas", action: "new" }, { replace: true });
  };

  const isFinanceiroTab = FINANCEIRO_TABS.some(t => t.key === activeTab);
  const isGestaoTab = GESTAO_TABS.some(t => t.key === activeTab);
  const showPeriodSelector = true;

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in">
        {/* Page Header with actions */}
        <PageHeader
          pageKey="financeiro"
          title="Gestão Financeira"
          subtitle="Controle simples e inteligente da sua agência"
          icon={DollarSign}
        >
          {GESTAO_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={cn(
                  "flex flex-col items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all bg-accent text-primary-foreground",
                  isActive
                    ? "shadow-lg"
                    : "hover:shadow-lg"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}


          {showPeriodSelector && (
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToPrevMonth}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-center min-w-[140px]">
                <span className="text-sm font-semibold">{periodLabel}</span>
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8" onClick={goToNextMonth}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              {!isCurrentMonth && (
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={goToCurrentMonth}>
                  <Calendar className="h-3 w-3" />
                  Hoje
                </Button>
              )}
            </div>
          )}
        </PageHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-1">

            {/* Tab Content */}
            <div>
              {activeTab === "dashboard" && (
                <SmartDashboard viewMonth={viewMonth} viewYear={viewYear} />
              )}
              {activeTab === "entradas" && <EntradasManager />}
              {activeTab === "despesas" && <SmartExpenseManager />}
              {activeTab === "vendas" && <SalesManager />}
              {activeTab === "comissoes" && <CommissionsReceivable />}
              {activeTab === "vendedores" && <SellersManager />}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
