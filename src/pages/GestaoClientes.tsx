import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/layout/PageHeader";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Users, Kanban, Briefcase, LayoutDashboard } from "lucide-react";
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

/** Botões coloridos no padrão da Gestão Financeira (reaproveita os tokens --fin-*). */
const CRM_TABS = [
  { key: "clientes", label: "Clientes", icon: Users, perm: "clients.view", color: "--fin-vendas" },
  { key: "funil", label: "Oportunidades", icon: Kanban, perm: "opportunities.view", color: "--fin-notas" },
  { key: "operacoes", label: "Operações", icon: Briefcase, perm: "operations.view", color: "--fin-entradas" },
  { key: "dashboard", label: "Visão Geral", icon: LayoutDashboard, perm: "dashboard.view", color: "--fin-dashboard" },
] as const;

/** Título e subtítulo identificam a área ativa. */
const HEADER: Record<string, { title: string; subtitle: string; icon: typeof Users }> = {
  clientes: { title: "Gestão de Relacionamento com Clientes", subtitle: "Base de contatos, histórico e cadastro de viajantes.", icon: Users },
  funil: { title: "Oportunidades", subtitle: "Negociações, orçamentos e fechamento de viagens.", icon: Kanban },
  operacoes: { title: "Operações", subtitle: "Reservas, emissões, embarques e pós-viagem.", icon: Briefcase },
  dashboard: { title: "Gestão de Relacionamento com Clientes", subtitle: "Indicadores de atendimento, conversão e metas.", icon: LayoutDashboard },
};

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

        {/* Título à esquerda; abas e ações da aba ativa no canto superior direito */}
        <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
          <div className="shrink-0 flex-1 basis-auto">
            <PageHeader
              pageKey="gestao-clientes"
              title={HEADER[currentTab]?.title ?? HEADER.clientes.title}
              subtitle={HEADER[currentTab]?.subtitle ?? HEADER.clientes.subtitle}
              icon={HEADER[currentTab]?.icon ?? Users}
            />
          </div>
        <div className="-mx-1 flex flex-nowrap items-center justify-end gap-2 px-1 md:mx-0">
          <TooltipProvider delayDuration={80}>
          <div role="tablist" aria-label="Seções do CRM" className="flex shrink-0 flex-nowrap items-center gap-2">
            {CRM_TABS.filter(t => can(t.perm)).map(t => {
              const Icon = t.icon;
              const active = currentTab === t.key;
              const v = `var(${t.color})`;
              return (
                <Tooltip key={t.key}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      role="tab"
                      value={t.key}
                      aria-selected={active}
                      aria-label={t.label}
                      onClick={() => onTabChange(t.key)}
                      className="flex h-10 min-w-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-2.5 text-sm font-semibold transition-all hover:-translate-y-0.5 hover:shadow-md 2xl:px-4"
                      style={active
                        ? { backgroundColor: `hsl(${v})`, color: "hsl(var(--primary-foreground))", boxShadow: `0 6px 16px -6px hsl(${v} / 0.6)` }
                        : { backgroundColor: `hsl(${v} / 0.1)`, color: `hsl(${v})` }}
                    >
                      <Icon className="h-5 w-5 shrink-0 2xl:h-[18px] 2xl:w-[18px]" />
                      <span className="hidden 2xl:inline">{t.label}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="font-medium 2xl:hidden">{t.label}</TooltipContent>
                </Tooltip>
              );
            })}
          </div>
          </TooltipProvider>

          {/* Ações da aba ativa (busca, + Nova, Maximizar, Importar) */}
          <div
            ref={setToolbarEl}
            data-testid="crm-toolbar-slot"
            className="flex min-w-0 flex-nowrap items-center justify-end gap-1.5"
          />
        </div>
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