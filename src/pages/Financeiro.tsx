import { useSearchParams } from "react-router-dom";
import { Loader2, DollarSign, LayoutDashboard, ArrowDownCircle, ShoppingBag, ArrowUpCircle, Receipt } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartDashboard } from "@/components/financial/SmartDashboard";
import { SmartExpenseManager } from "@/components/financial/SmartExpenseManager";
import { SalesManager } from "@/components/financial/SalesManager";
import { EntradasManager } from "@/components/financial/EntradasManager";
import { CommissionsReceivable } from "@/components/financial/CommissionsReceivable";
import { useFinancial } from "@/hooks/useFinancial";

const VALID_TABS = ["vendas", "comissoes", "entradas", "despesas", "dashboard"] as const;

export default function Financeiro() {
  const { isLoading } = useFinancial();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = VALID_TABS.includes(tabParam as any) ? tabParam! : "vendas";

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value }, { replace: true });
  };

  return (
    <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="financeiro"
            title="Gestão Financeira"
            subtitle="Controle simples e inteligente da sua agência"
            icon={DollarSign}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
              <TabsList className="grid w-full grid-cols-5 max-w-2xl">
                <TabsTrigger value="vendas" className="gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Vendas</span>
                </TabsTrigger>
                <TabsTrigger value="comissoes" className="gap-1.5">
                  <Receipt className="h-4 w-4" />
                  <span className="hidden sm:inline">Comissões</span>
                </TabsTrigger>
                <TabsTrigger value="entradas" className="gap-1.5">
                  <ArrowUpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Entradas</span>
                </TabsTrigger>
                <TabsTrigger value="despesas" className="gap-1.5">
                  <ArrowDownCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Despesas</span>
                </TabsTrigger>
                <TabsTrigger value="dashboard" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vendas">
                <SalesManager />
              </TabsContent>

              <TabsContent value="comissoes">
                <CommissionsReceivable />
              </TabsContent>

              <TabsContent value="despesas">
                <SmartExpenseManager />
              </TabsContent>

              <TabsContent value="entradas">
                <EntradasManager />
              </TabsContent>

              <TabsContent value="dashboard">
                <SmartDashboard />
              </TabsContent>
            </Tabs>
          )}
        </div>
    </DashboardLayout>
  );
}
