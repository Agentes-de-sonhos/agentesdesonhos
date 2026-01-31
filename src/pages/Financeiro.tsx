import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialDashboard } from "@/components/financial/FinancialDashboard";
import { SalesManager } from "@/components/financial/SalesManager";
import { CashFlowManager } from "@/components/financial/CashFlowManager";
import { FinancialReports } from "@/components/financial/FinancialReports";
import { useFinancial } from "@/hooks/useFinancial";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";

export default function Financeiro() {
  const { summary, isLoading } = useFinancial();

  return (
    <SubscriptionGuard feature="financial">
      <DashboardLayout>
        <div className="space-y-6 animate-fade-in">
          <div>
            <h1 className="font-display text-3xl font-bold text-foreground">
              Financeiro
            </h1>
            <p className="mt-2 text-muted-foreground">
              Gerencie vendas, produtos, custos e fluxo de caixa
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <FinancialDashboard summary={summary} />

              <Tabs defaultValue="vendas" className="space-y-6">
                <TabsList className="grid w-full grid-cols-3 max-w-md">
                  <TabsTrigger value="vendas">Vendas</TabsTrigger>
                  <TabsTrigger value="caixa">Fluxo de Caixa</TabsTrigger>
                  <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
                </TabsList>

                <TabsContent value="vendas">
                  <SalesManager />
                </TabsContent>

                <TabsContent value="caixa">
                  <CashFlowManager />
                </TabsContent>

                <TabsContent value="relatorios">
                  <FinancialReports />
                </TabsContent>
              </Tabs>
            </>
          )}
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
