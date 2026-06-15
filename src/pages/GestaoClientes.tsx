import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { TeamMembersDialog } from "@/components/team/TeamMembersDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, Target, Briefcase, LayoutDashboard, UserCog } from "lucide-react";
import { ClientsModule } from "@/components/crm/ClientsModule";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { SalesGoalsModule } from "@/components/crm/SalesGoalsModule";
import { OperationsModule } from "@/components/crm/operations/OperationsModule";
import { DashboardModule } from "@/components/crm/DashboardModule";
import { useLocation, useNavigate } from "react-router-dom";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useEffect, useState } from "react";

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
  const { can, isTeamMember } = usePermissions();
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);

  const tabPermission: Record<string, string> = {
    dashboard: 'dashboard.view',
    clientes: 'clients.view',
    funil: 'opportunities.view',
    operacoes: 'operations.view',
    metas: 'goals.view',
  };

  const getCurrentTab = () => {
    if (location.pathname.includes('/dashboard')) return 'dashboard';
    if (location.pathname.includes('/funil')) return 'funil';
    if (location.pathname.includes('/metas')) return 'metas';
    if (location.pathname.includes('/operacoes')) return 'operacoes';
    if (location.pathname.includes('/clientes')) return 'clientes';
    return 'dashboard';
  };

  const handleTabChange = (value: string) => {
    if (value === 'equipe') {
      setTeamDialogOpen(true);
      return;
    }
    const routes: Record<string, string> = {
      dashboard: '/gestao-clientes/dashboard',
      clientes: '/gestao-clientes/clientes',
      funil: '/gestao-clientes/funil',
      metas: '/gestao-clientes/metas',
      operacoes: '/gestao-clientes/operacoes',
    };
    navigate(routes[value] || '/gestao-clientes/dashboard');
  };

  const visibleTabs = (['dashboard','clientes','funil','operacoes','metas'] as const).filter(t => can(tabPermission[t]));
  const currentTab = getCurrentTab();

  // Redireciona para a primeira tab permitida se a atual estiver bloqueada
  useEffect(() => {
    if (!isTeamMember) return;
    if (visibleTabs.length === 0) {
      navigate('/team-dashboard', { replace: true });
      return;
    }
    if (!visibleTabs.includes(currentTab as any)) {
      const routes: Record<string, string> = {
        dashboard: '/gestao-clientes/dashboard',
        clientes: '/gestao-clientes/clientes',
        funil: '/gestao-clientes/funil',
        operacoes: '/gestao-clientes/operacoes',
        metas: '/gestao-clientes/metas',
      };
      navigate(routes[visibleTabs[0]], { replace: true });
    }
  }, [isTeamMember, currentTab, visibleTabs.join(','), navigate]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          pageKey="gestao-clientes"
          title="Clientes"
          subtitle="Gerencie clientes, oportunidades e metas de vendas"
          icon={Users}
          adminTab="crm"
        />

        <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
          {/* Mobile: horizontal scroll; Desktop: grid 6 cols */}
          <div className="-mx-1 overflow-x-auto md:mx-0 md:overflow-visible scrollbar-thin">
            <TabsList className="inline-flex w-max gap-1 md:grid md:w-full md:max-w-3xl md:grid-cols-6">
              {can('dashboard.view') && (
                <TabsTrigger value="dashboard" className="gap-1.5 whitespace-nowrap px-3">
                  <LayoutDashboard className="h-4 w-4 shrink-0" />
                  Dashboard
                </TabsTrigger>
              )}
              {can('clients.view') && (
                <TabsTrigger value="clientes" className="gap-1.5 whitespace-nowrap px-3">
                  <Users className="h-4 w-4 shrink-0" />
                  Clientes
                </TabsTrigger>
              )}
              {can('opportunities.view') && (
                <TabsTrigger value="funil" className="gap-1.5 whitespace-nowrap px-3">
                  <Kanban className="h-4 w-4 shrink-0" />
                  Oportunidades
                </TabsTrigger>
              )}
              {can('operations.view') && (
                <TabsTrigger value="operacoes" className="gap-1.5 whitespace-nowrap px-3">
                  <Briefcase className="h-4 w-4 shrink-0" />
                  Operações
                </TabsTrigger>
              )}
              {can('goals.view') && (
                <TabsTrigger value="metas" className="gap-1.5 whitespace-nowrap px-3">
                  <Target className="h-4 w-4 shrink-0" />
                  <span className="md:hidden">Metas</span>
                  <span className="hidden md:inline">Meta de Vendas</span>
                </TabsTrigger>
              )}
              {!isTeamMember && (
                <TabsTrigger value="equipe" className="gap-1.5 whitespace-nowrap px-3">
                  <UserCog className="h-4 w-4 shrink-0" />
                  <span className="md:hidden">Equipe</span>
                  <span className="hidden md:inline">Usuários da Equipe</span>
                </TabsTrigger>
              )}
            </TabsList>
          </div>
          <TabsContent value="dashboard" className="mt-6">
            <PermissionGate permission="dashboard.view"><DashboardModule /></PermissionGate>
          </TabsContent>
          <TabsContent value="clientes" className="mt-6">
            <PermissionGate permission="clients.view"><ClientsModule /></PermissionGate>
          </TabsContent>
          <TabsContent value="funil" className="mt-6">
            <PermissionGate permission="opportunities.view"><KanbanBoard /></PermissionGate>
          </TabsContent>
          <TabsContent value="operacoes" className="mt-6">
            <PermissionGate permission="operations.view"><OperationsModule /></PermissionGate>
          </TabsContent>
          <TabsContent value="metas" className="mt-6">
            <PermissionGate permission="goals.view"><SalesGoalsModule /></PermissionGate>
          </TabsContent>
        </Tabs>

        <TeamMembersDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} />
      </div>
    </DashboardLayout>
  );
}