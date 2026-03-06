import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban, Target } from "lucide-react";
import { ClientsModule } from "@/components/crm/ClientsModule";
import { KanbanBoard } from "@/components/crm/KanbanBoard";
import { SalesGoalsModule } from "@/components/crm/SalesGoalsModule";
import { useLocation, useNavigate } from "react-router-dom";

export default function GestaoClientes() {
  const location = useLocation();
  const navigate = useNavigate();
  
  const getCurrentTab = () => {
    if (location.pathname.includes('/funil')) return 'funil';
    if (location.pathname.includes('/metas')) return 'metas';
    return 'clientes';
  };

  const handleTabChange = (value: string) => {
    const routes: Record<string, string> = {
      clientes: '/gestao-clientes/clientes',
      funil: '/gestao-clientes/funil',
      metas: '/gestao-clientes/metas',
    };
    navigate(routes[value] || '/gestao-clientes');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">Gestão de Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie clientes, oportunidades e metas de vendas
          </p>
        </div>

        <Tabs value={getCurrentTab()} onValueChange={handleTabChange} className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-lg">
            <TabsTrigger value="clientes" className="gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
            <TabsTrigger value="funil" className="gap-2">
              <Kanban className="h-4 w-4" />
              Oportunidades
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
          <TabsContent value="metas" className="mt-6">
            <SalesGoalsModule />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}