import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamMembersButton } from "@/components/team/TeamMembersButton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, Target, Briefcase, LayoutDashboard } from "lucide-react";
import { ClientsModule } from "@/components/crm/ClientsModule";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { SalesGoalsModule } from "@/components/crm/SalesGoalsModule";
import { OperationsModule } from "@/components/crm/operations/OperationsModule";
import { DashboardModule } from "@/components/crm/DashboardModule";
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
    if (location.pathname.includes('/dashboard')) return 'dashboard';
    if (location.pathname.includes('/funil')) return 'funil';
    if (location.pathname.includes('/metas')) return 'metas';
    if (location.pathname.includes('/operacoes')) return 'operacoes';
    if (location.pathname.includes('/clientes')) return 'clientes';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      dashboard: '/gestao-clientes/dashboard',
      clientes: '/gestao-clientes/clientes',
      funil: '/gestao-clientes/funil',
      metas: '/gestao-clientes/metas',
      operacoes: '/gestao-clientes/operacoes',
    };
    navigate(routes[value] || '/gestao-clientes/dashboard');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="gestao-clientes"
          title="Clientes"
          subtitle="Gerencie clientes, oportunidades e metas de vendas"
          icon={Users}
          adminTab="crm"
        >
          <TeamMembersButton />
        </PageHeader>

        <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
          {/* Mobile: horizontal scroll; Desktop: grid 5 cols */}
          <div className="-mx-1 overflow-x-auto md:mx-0 md:overflow-visible scrollbar-thin">
            <TabsList className="inline-flex w-max gap-1 md:grid md:w-full md:max-w-3xl md:grid-cols-5">
              <TabsTrigger value="dashboard" className="gap-1.5 whitespace-nowrap px-3">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Dashboard
              </TabsTrigger>
              <TabsTrigger value="clientes" className="gap-1.5 whitespace-nowrap px-3">
                <Users className="h-4 w-4 shrink-0" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="funil" className="gap-1.5 whitespace-nowrap px-3">
                <Kanban className="h-4 w-4 shrink-0" />
                Oportunidades
              </TabsTrigger>
              <TabsTrigger value="operacoes" className="gap-1.5 whitespace-nowrap px-3">
                <Briefcase className="h-4 w-4 shrink-0" />
                Operações
              </TabsTrigger>
              <TabsTrigger value="metas" className="gap-1.5 whitespace-nowrap px-3">
                <Target className="h-4 w-4 shrink-0" />
                <span className="md:hidden">Metas</span>
                <span className="hidden md:inline">Meta de Vendas</span>
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="mt-6">
            <DashboardModule />
          </TabsContent>
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