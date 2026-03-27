import { Loader2, DollarSign, LayoutDashboard, ArrowDownCircle, ShoppingBag, ArrowUpCircle } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SmartDashboard } from "@/components/financial/SmartDashboard";
import { SmartExpenseManager } from "@/components/financial/SmartExpenseManager";
import { SalesManager } from "@/components/financial/SalesManager";
import { EntradasManager } from "@/components/financial/EntradasManager";
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
            title="Gestão Financeira"
            subtitle="Controle simples e inteligente da sua agência"
            icon={DollarSign}
          />

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Tabs defaultValue="dashboard" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4 max-w-lg">
                <TabsTrigger value="dashboard" className="gap-1.5">
                  <LayoutDashboard className="h-4 w-4" />
                  <span className="hidden sm:inline">Dashboard</span>
                </TabsTrigger>
                <TabsTrigger value="despesas" className="gap-1.5">
                  <ArrowDownCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Despesas</span>
                </TabsTrigger>
                <TabsTrigger value="vendas" className="gap-1.5">
                  <ShoppingBag className="h-4 w-4" />
                  <span className="hidden sm:inline">Vendas</span>
                </TabsTrigger>
                <TabsTrigger value="entradas" className="gap-1.5">
                  <ArrowUpCircle className="h-4 w-4" />
                  <span className="hidden sm:inline">Entradas</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="dashboard">
                <SmartDashboard />
              </TabsContent>

              <TabsContent value="despesas">
                <SmartExpenseManager />
              </TabsContent>

              <TabsContent value="vendas">
                <SalesManager />
              </TabsContent>

              <TabsContent value="entradas">
                <EntradasManager />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </DashboardLayout>
    </SubscriptionGuard>
  );
}
