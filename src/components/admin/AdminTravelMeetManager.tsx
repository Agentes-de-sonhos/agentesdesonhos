import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, XCircle, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

interface TravelMeetSupplier {
  id: string;
  company_name: string;
  brand_name?: string;
  business_category?: string;
  website?: string;
  country?: string;
  city?: string;
  commercial_email?: string;
  contact_person_name?: string;
  short_description?: string;
  status: string;
  submitted_at?: string;
  created_at?: string;
  logo_url?: string;
}

type StatusFilter = "pending_approval" | "approved" | "rejected";

const STATUS_LABELS: Record<StatusFilter, string> = {
  pending_approval: "Pendentes",
  approved: "Aprovados",
  rejected: "Rejeitados",
};

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive"> = {
  pending_approval: "default",
  approved: "secondary",
  rejected: "destructive",
};

export function AdminTravelMeetManager() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending_approval");
  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["travelmeet-admin-suppliers", statusFilter],
    queryFn: async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/travelmeet-admin?status=${statusFilter}&limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao buscar dados");
      }
      return res.json();
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "approve" | "reject" }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) throw new Error("Não autenticado");

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/travelmeet-admin`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({ id, action }),
        }
      );
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Erro ao processar ação");
      }
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast.success(variables.action === "approve" ? "Cadastro aprovado!" : "Cadastro rejeitado!");
      queryClient.invalidateQueries({ queryKey: ["travelmeet-admin-suppliers"] });
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const suppliers: TravelMeetSupplier[] = Array.isArray(data) ? data : data?.suppliers || [];

  const formatDate = (d?: string) => {
    if (!d) return "—";
    return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">TravelMeet — Gestão de Cadastros</CardTitle>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-2">
          <RefreshCw className="h-4 w-4" /> Atualizar
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
          <TabsList>
            <TabsTrigger value="pending_approval">Pendentes</TabsTrigger>
            <TabsTrigger value="approved">Aprovados</TabsTrigger>
            <TabsTrigger value="rejected">Rejeitados</TabsTrigger>
          </TabsList>
        </Tabs>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : suppliers.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum cadastro {STATUS_LABELS[statusFilter].toLowerCase()} encontrado.
          </p>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead>Localização</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Status</TableHead>
                  {statusFilter === "pending_approval" && <TableHead className="text-right">Ações</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {suppliers.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-0">
                        {s.logo_url && (
                          <img src={s.logo_url} alt="" className="h-8 w-8 rounded object-contain bg-muted flex-shrink-0" />
                        )}
                        <div className="min-w-0">
                          <p className="font-medium truncate">{s.company_name || s.brand_name}</p>
                          {s.brand_name && s.company_name !== s.brand_name && (
                            <p className="text-xs text-muted-foreground truncate">{s.brand_name}</p>
                          )}
                          {s.website && (
                            <a href={s.website} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                              Site <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{s.business_category || "—"}</TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <p>{s.contact_person_name || "—"}</p>
                        {s.commercial_email && <p className="text-xs text-muted-foreground">{s.commercial_email}</p>}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                    </TableCell>
                    <TableCell className="text-sm whitespace-nowrap">
                      {formatDate(s.submitted_at || s.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_BADGE[s.status] || "default"}>
                        {STATUS_LABELS[s.status as StatusFilter] || s.status}
                      </Badge>
                    </TableCell>
                    {statusFilter === "pending_approval" && (
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-green-600 hover:text-green-700"
                            disabled={actionMutation.isPending}
                            onClick={() => actionMutation.mutate({ id: s.id, action: "approve" })}
                          >
                            <CheckCircle className="h-4 w-4" /> Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1 text-destructive hover:text-destructive"
                            disabled={actionMutation.isPending}
                            onClick={() => actionMutation.mutate({ id: s.id, action: "reject" })}
                          >
                            <XCircle className="h-4 w-4" /> Rejeitar
                          </Button>
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
