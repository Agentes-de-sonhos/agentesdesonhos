import { Loader2, DollarSign } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartDashboard } from "@/components/financial/SmartDashboard";
import { SmartExpenseManager } from "@/components/financial/SmartExpenseManager";
import { SalesManager } from "@/components/financial/SalesManager";
import { CashFlowManager } from "@/components/financial/CashFlowManager";
import { useFinancial } from "@/hooks/useFinancial";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";

export default function Financeiro() {
  const { isLoading } = useFinancial();

  return (
    <SubscriptionGuard feature="financial">
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <PageHeader
            pageKey="financeiro"
            title="Financeiro"
            subtitle="Controle mensal inteligente com metas, break-even e projeções"
            icon={DollarSign}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <SmartDashboard />

              <Tabs defaultValue="despesas" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                  <TabsTrigger value="despesas">Despesas</TabsTrigger>
                  <TabsTrigger value="vendas">Vendas</TabsTrigger>
                  <TabsTrigger value="caixa">Fluxo de Caixa</TabsTrigger>
                </TabsList>

                <TabsContent value="despesas">
                  <SmartExpenseManager />
                </TabsContent>

                <TabsContent value="vendas">
                  <SalesManager />
                </TabsContent>

                <TabsContent value="caixa">
                  <CashFlowManager />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
