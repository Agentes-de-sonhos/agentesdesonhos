import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, Target, Briefcase, LayoutDashboard } from "lucide-react";
import { ClientsModule } from "@/components/crm/ClientsModule";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { SalesGoalsModule } from "@/components/crm/SalesGoalsModule";
import { OperationsModule } from "@/components/crm/operations/OperationsModule";
import { DashboardModule } from "@/components/crm/DashboardModule";
import { useLocation, useNavigate } from "react-router-dom";
import { SubscriptionGuard } from "@/components/subscription/SubscriptionGuard";
import { usePermissions } from "@/hooks/usePermissions";
import { PermissionGate } from "@/components/permissions/PermissionGate";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { KanbanMaximizeProvider, useKanbanMaximize } from "@/components/crm/kanban/KanbanMaximizeContext";
import { KanbanMaximizeSurface } from "@/components/crm/kanban/KanbanMaximizeSurface";
import { useAdminNav, type CrmTab } from "@/lib/agencyAdminNav";

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
  // Rotas das abas seguem o contexto: /gestao/crm/* no painel white label,
  // /gestao-clientes/* na plataforma tradicional.
  const nav = useAdminNav();
  const tabRoute = (tab: string) => nav.crm(tab as CrmTab);

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
    return 'funil';
  };

  const handleTabChange = (value: string) => {
    navigate(tabRoute(value || 'dashboard'));
  };

  const visibleTabs = (['funil','operacoes','clientes','dashboard','metas'] as const).filter(t => can(tabPermission[t]));
  const currentTab = getCurrentTab();

  // Redireciona para a primeira tab permitida se a atual estiver bloqueada
  useEffect(() => {
    if (!isTeamMember) return;
    if (visibleTabs.length === 0) {
      navigate(nav.financeiro, { replace: true });
      return;
    }
    if (!visibleTabs.includes(currentTab as any)) {
      navigate(tabRoute(visibleTabs[0]), { replace: true });
    }
  }, [isTeamMember, currentTab, visibleTabs.join(','), navigate]);

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <KanbanMaximizeProvider>
          <KanbanTabsSurface currentTab={currentTab} onTabChange={handleTabChange} can={can} />
        </KanbanMaximizeProvider>

      </div>
    </DashboardLayout>

  );
}

function KanbanTabsSurface({
  currentTab,
  onTabChange,
  can,
}: {
  currentTab: string;
  onTabChange: (v: string) => void;
  can: (p: string) => boolean;
}) {
  const { isMaximized, setToolbarEl } = useKanbanMaximize();

  return (
    <KanbanMaximizeSurface className={cn(!isMaximized && "flex w-full flex-col")}>
      <Tabs
        value={currentTab}
        onValueChange={onTabChange}
        className={cn("flex w-full min-h-0 flex-1 flex-col")}
      >

        {/* Navegação + ações: quebra em linhas no mobile, sem scroll horizontal */}
        <div className="-mx-1 flex flex-wrap items-center gap-2 px-1 md:mx-0">
          <TabsList className="inline-flex w-max shrink-0 gap-0.5">
            {can('opportunities.view') && (
              <TabsTrigger value="funil" className="gap-1.5 whitespace-nowrap px-2.5 text-xs">
                <Kanban className="h-4 w-4 shrink-0" />
                Oportunidades
              </TabsTrigger>
            )}
            {can('operations.view') && (
              <TabsTrigger value="operacoes" className="gap-1.5 whitespace-nowrap px-2.5 text-xs">
                <Briefcase className="h-4 w-4 shrink-0" />
                Operações
              </TabsTrigger>
            )}
            {can('clients.view') && (
              <TabsTrigger value="clientes" className="gap-1.5 whitespace-nowrap px-2.5 text-xs">
                <Users className="h-4 w-4 shrink-0" />
                Clientes
              </TabsTrigger>
            )}
          </TabsList>

          {/* Ações da aba ativa (busca, + Nova, Maximizar) */}
          <div
            ref={setToolbarEl}
            data-testid="crm-toolbar-slot"
            className="flex min-w-0 flex-wrap items-center gap-1.5"
          />

          {/* Visão Geral e Meta de Vendas alinhados à direita */}
          <TabsList className="ml-auto inline-flex w-max shrink-0 gap-0.5">
            {can('dashboard.view') && (
              <TabsTrigger value="dashboard" className="gap-1.5 whitespace-nowrap px-2.5 text-xs">
                <LayoutDashboard className="h-4 w-4 shrink-0" />
                Visão Geral
              </TabsTrigger>
            )}
            {can('goals.view') && (
              <TabsTrigger value="metas" className="gap-1.5 whitespace-nowrap px-2.5 text-xs">
                <Target className="h-4 w-4 shrink-0" />
                <span className="md:hidden">Metas</span>
                <span className="hidden md:inline">Meta de Vendas</span>
              </TabsTrigger>
            )}
          </TabsList>
        </div>


        <TabsContent
          value="funil"
          className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <PermissionGate permission="opportunities.view"><KanbanBoard /></PermissionGate>
        </TabsContent>
        <TabsContent
          value="operacoes"
          className="mt-3 flex min-h-0 flex-1 flex-col data-[state=inactive]:hidden"
        >
          <PermissionGate permission="operations.view"><OperationsModule /></PermissionGate>
        </TabsContent>

        <TabsContent value="clientes" className="mt-6">
          <PermissionGate permission="clients.view"><ClientsModule /></PermissionGate>
        </TabsContent>
        <TabsContent value="dashboard" className="mt-6">
          <PermissionGate permission="dashboard.view"><DashboardModule /></PermissionGate>
        </TabsContent>
        <TabsContent value="metas" className="mt-6">
          <PermissionGate permission="goals.view"><SalesGoalsModule /></PermissionGate>
        </TabsContent>
      </Tabs>
    </KanbanMaximizeSurface>
  );
}