import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Kanban } from "lucide-react";
import { ClientsManager } from "@/components/crm/ClientsManager";
import { KanbanBoard } from "@/components/crm/KanbanBoard";

export default function CRM() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">CRM</h1>
          <p className="text-muted-foreground">Gerencie clientes e oportunidades de vendas</p>
        </div>

        <Tabs defaultValue="kanban" className="w-full">
          <TabsList>
            <TabsTrigger value="kanban" className="gap-2">
              <Kanban className="h-4 w-4" />
              Pipeline de Vendas
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <Users className="h-4 w-4" />
              Clientes
            </TabsTrigger>
          </TabsList>
          <TabsContent value="kanban" className="mt-6">
            <KanbanBoard />
          </TabsContent>
          <TabsContent value="clients" className="mt-6">
            <ClientsManager />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
