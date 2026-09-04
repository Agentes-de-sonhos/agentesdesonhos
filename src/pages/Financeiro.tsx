import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  Loader2, DollarSign, LayoutDashboard, ArrowDownCircle,
  ShoppingBag, ArrowUpCircle, Receipt, Users,
  ChevronLeft, ChevronRight, Calendar, FileText, Truck,
  ReceiptText, FileSpreadsheet, FileSignature,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
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
import { useAdminNav } from "@/lib/agencyAdminNav";

const MONTH_NAMES = [
  "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

/** Abas superiores (ordem exata). "Visão Geral" fica ao lado do seletor de mês. */
const ALL_TABS_DEF = [
  { key: "vendas", label: "Vendas", icon: ShoppingBag },
  { key: "entradas", label: "Entradas", icon: ArrowUpCircle },
  { key: "comissoes", label: "Comissões", icon: Receipt },
  { key: "despesas", label: "Despesas", icon: ArrowDownCircle },
  { key: "vendedores", label: "Vendedores", icon: Users },
  { key: "recibos", label: "Recibos", icon: ReceiptText },
  { key: "faturas", label: "Faturas", icon: FileText },
  { key: "notas-fiscais", label: "Notas Fiscais", icon: FileSpreadsheet },
  { key: "contratos", label: "Contratos", icon: FileSignature },
  { key: "fornecedores", label: "Fornecedores", icon: Truck },
] as const;

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

  const tabClass = (isActive: boolean) =>
    cn(
      "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap",
      isActive
        ? "bg-primary text-primary-foreground shadow-sm"
        : "text-muted-foreground hover:bg-muted hover:text-foreground"
    );

  return (
    <DashboardLayout>
      <div className="space-y-4 animate-fade-in relative">
        <PermissionGate permission="financial.access">
        <div className="relative">
          <PageHeader
            pageKey="financeiro"
            title="Gestão Financeira"
            subtitle="Controle simples da sua agência"
            icon={DollarSign}
          />


          {showPeriodSelector && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goToPrevMonth} aria-label="Mês anterior">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="text-center min-w-[160px] px-3 py-2 rounded-lg bg-muted/50">
                <span className="text-base sm:text-lg font-semibold">{periodLabel}</span>
              </div>
              <Button variant="outline" size="icon" className="h-10 w-10" onClick={goToNextMonth} aria-label="Próximo mês">
                <ChevronRight className="h-5 w-5" />
              </Button>
              {!isCurrentMonth && (
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={goToCurrentMonth}>
                  <Calendar className="h-3 w-3" />
                  Hoje
                </Button>
              )}
              <Button
                variant={activeTab === "dashboard" ? "default" : "outline"}
                className="gap-1.5"
                onClick={() => handleTabChange("dashboard")}
              >
                <LayoutDashboard className="h-4 w-4" />
                Visão Geral
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            <div
              className="flex items-center gap-1 overflow-x-auto pb-1 -mb-1"
              role="tablist"
              aria-label="Seções da Gestão Financeira"
            >
              {ALL_TABS_DEF.map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleTabChange(tab.key)}
                    className={tabClass(isActive)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
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
