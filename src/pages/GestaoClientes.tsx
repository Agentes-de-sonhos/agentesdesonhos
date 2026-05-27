import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, Target, Briefcase } from "lucide-react";
import { ClientsModule } from "@/components/crm/ClientsModule";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { SalesGoalsModule } from "@/components/crm/SalesGoalsModule";
import { OperationsModule } from "@/components/crm/operations/OperationsModule";
import { useLocation, useNavigate } from "react-router-dom";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";

export default function GestaoClientes() {
  return (
    <SubscriptionGuard feature="crm_basic">
      <GestaoClientesContent />
    </SubscriptionGuard>
  );
}

function GestaoClientesContent() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getCurrentTab = () => {
    if (location.pathname.includes('/funil')) return 'funil';
    if (location.pathname.includes('/metas')) return 'metas';
    if (location.pathname.includes('/operacoes')) return 'operacoes';
    return 'clientes';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      clientes: '/gestao-clientes/clientes',
      funil: '/gestao-clientes/funil',
      metas: '/gestao-clientes/metas',
      operacoes: '/gestao-clientes/operacoes',
    };
    navigate(routes[value] || '/gestao-clientes');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="gestao-clientes"
          title="Gestão de Clientes"
          subtitle="Gerencie clientes, oportunidades e metas de vendas"
          icon={Users}
          adminTab="crm"
        />

        <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-4 max-w-2xl">
            <TabsTrigger value="clientes" className="gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="funil" className="gap-2">
              <Kanban className="h-4 w-4" />
              Oportunidades
            </TabsTrigger>
            <TabsTrigger value="operacoes" className="gap-2">
              <Briefcase className="h-4 w-4" />
              Operações
            </TabsTrigger>
            <TabsTrigger value="metas" className="gap-2">
              <Target className="h-4 w-4" />
              Meta de Vendas
            </TabsTrigger>
          </TabsList>
          <TabsContent value="clientes" className="mt-6">
            <ClientsModule />
          </TabsContent>
          <TabsContent value="funil" className="mt-6">
            <KanbanBoard />
          </TabsContent>
          <TabsContent value="operacoes" className="mt-6">
            <OperationsModule />
          </TabsContent>
          <TabsContent value="metas" className="mt-6">
            <SalesGoalsModule />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}