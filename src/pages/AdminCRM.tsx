import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Mail, FileText } from "lucide-react";
import { AdminCrmContacts } from "@/components/admin/crm/AdminCrmContacts";
import { AdminCrmTemplates } from "@/components/admin/crm/AdminCrmTemplates";
import { AdminCrmLogs } from "@/components/admin/crm/AdminCrmLogs";

export default function AdminCRM() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="font-display text-2xl font-bold">CRM Administrativo</h1>
          <p className="text-muted-foreground">Importe contatos e envie emails personalizados</p>
        </div>

        <Tabs defaultValue="contacts" className="w-full">
          <TabsList>
            <TabsTrigger value="contacts" className="gap-2">
              <Users className="h-4 w-4" />
              Contatos
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="logs" className="gap-2">
              <Mail className="h-4 w-4" />
              Histórico de Envios
            </TabsTrigger>
          </TabsList>
          <TabsContent value="contacts" className="mt-6">
            <AdminCrmContacts />
          </TabsContent>
          <TabsContent value="templates" className="mt-6">
            <AdminCrmTemplates />
          </TabsContent>
          <TabsContent value="logs" className="mt-6">
            <AdminCrmLogs />
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
