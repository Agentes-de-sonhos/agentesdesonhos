import { Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FinancialDashboard } from "@/components/financial/FinancialDashboard";
import { SalesManager } from "@/components/financial/SalesManager";
import { IncomeManager } from "@/components/financial/IncomeManager";
import { ExpenseManager } from "@/components/financial/ExpenseManager";
import { FinancialReports } from "@/components/financial/FinancialReports";
import { useFinancial } from "@/hooks/useFinancial";

export default function Financeiro() {
  const { summary, isLoading } = useFinancial();

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Financeiro
          </h1>
          <p className="mt-2 text-muted-foreground">
            Gerencie vendas, recebimentos e despesas
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
              <TabsList className="grid w-full grid-cols-4 max-w-xl">
                <TabsTrigger value="vendas">Vendas</TabsTrigger>
                <TabsTrigger value="entradas">Entradas</TabsTrigger>
                <TabsTrigger value="saidas">Saídas</TabsTrigger>
                <TabsTrigger value="relatorios">Relatórios</TabsTrigger>
              </TabsList>

              <TabsContent value="vendas">
                <SalesManager />
              </TabsContent>

              <TabsContent value="entradas">
                <IncomeManager />
              </TabsContent>

              <TabsContent value="saidas">
                <ExpenseManager />
              </TabsContent>

              <TabsContent value="relatorios">
                <FinancialReports />
              </TabsContent>
            </Tabs>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
