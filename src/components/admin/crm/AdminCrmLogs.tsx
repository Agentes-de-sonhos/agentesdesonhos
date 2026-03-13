import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface CrmEmailLog {
  id: string;
  email: string;
  assunto: string;
  status: string;
  sent_at: string;
  crm_contacts: { nome: string } | null;
  crm_email_templates: { nome_template: string } | null;
}

export function AdminCrmLogs() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["crm-email-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_email_logs")
        .select("*, crm_contacts(nome), crm_email_templates(nome_template)")
        .order("sent_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data as unknown as CrmEmailLog[];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Histórico de Envios</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Contato</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Template</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Enviado em</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.crm_contacts?.nome || "—"}</TableCell>
                  <TableCell>{log.email}</TableCell>
                  <TableCell>{log.assunto}</TableCell>
                  <TableCell>{log.crm_email_templates?.nome_template || "—"}</TableCell>
                  <TableCell>
                    <Badge variant={log.status === "enviado" ? "default" : "destructive"}>
                      {log.status === "enviado" ? "Enviado" : "Erro"}
                    </Badge>
                  </TableCell>
                  <TableCell>{format(new Date(log.sent_at), "dd/MM/yyyy HH:mm")}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    Nenhum email enviado ainda
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
