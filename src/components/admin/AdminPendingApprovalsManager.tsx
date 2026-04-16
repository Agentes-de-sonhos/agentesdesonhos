import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  CheckCircle2,
  XCircle,
  Eye,
  Loader2,
  Building2,
  Clock,
  Mail,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useNavigate } from "react-router-dom";

type ApprovalStatus = "pending" | "approved" | "rejected";

export function AdminPendingApprovalsManager() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | "all">("pending");
  const [search, setSearch] = useState("");
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: string; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const { data: operators = [], isLoading } = useQuery({
    queryKey: ["admin-pending-approvals", statusFilter],
    queryFn: async () => {
      let query = supabase
        .from("tour_operators")
        .select("*")
        .order("created_at", { ascending: false });

      if (statusFilter !== "all") {
        query = query.eq("approval_status" as any, statusFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("tour_operators")
        .update({ approval_status: "approved", is_active: true } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      queryClient.invalidateQueries({ queryKey: ["tour-operators-listing"] });
      toast.success("Cadastro aprovado! A empresa agora está visível no Mapa do Turismo.");
    },
    onError: (err: any) => toast.error("Erro ao aprovar: " + err.message),
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { error } = await supabase
        .from("tour_operators")
        .update({ approval_status: "rejected", is_active: false, rejection_reason: reason || null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-pending-approvals"] });
      setRejectDialogOpen(false);
      setRejectTarget(null);
      setRejectReason("");
      toast.success("Cadastro rejeitado.");
    },
    onError: (err: any) => toast.error("Erro ao rejeitar: " + err.message),
  });

  const filtered = operators.filter((op: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      op.name?.toLowerCase().includes(s) ||
      op.category?.toLowerCase().includes(s)
    );
  });

  const pendingCount = operators.filter((op: any) => op.approval_status === "pending").length;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200"><Clock className="h-3 w-3 mr-1" /> Pendente</Badge>;
      case "approved":
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200"><CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado</Badge>;
      case "rejected":
        return <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200"><XCircle className="h-3 w-3 mr-1" /> Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card className="rounded-2xl">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-primary" />
            Cadastros Pendentes
            {pendingCount > 0 && (
              <Badge className="bg-amber-500 text-white ml-2">{pendingCount}</Badge>
            )}
          </CardTitle>
        </div>

        <div className="flex gap-2 flex-wrap mt-3">
          {(["pending", "approved", "rejected", "all"] as const).map((s) => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              className="rounded-xl"
              onClick={() => setStatusFilter(s)}
            >
              {s === "pending" ? "Pendentes" : s === "approved" ? "Aprovados" : s === "rejected" ? "Rejeitados" : "Todos"}
            </Button>
          ))}
        </div>

        <div className="relative mt-2">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 rounded-xl"
          />
        </div>
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <Building2 className="h-10 w-10 mx-auto mb-3 opacity-40" />
            <p>Nenhum cadastro encontrado.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((op: any) => (
              <div
                key={op.id}
                className="flex items-center justify-between p-4 border rounded-xl hover:bg-muted/30 transition-colors"
              >
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    {op.logo_url ? (
                      <img src={op.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                    ) : (
                      <Building2 className="h-5 w-5 text-primary" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium text-sm truncate">{op.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5 flex-wrap">
                      <span>{op.category || "Sem categoria"}</span>
                      <span>•</span>
                      <span>{format(new Date(op.created_at), "dd/MM/yyyy", { locale: ptBR })}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {getStatusBadge(op.approval_status || "approved")}

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    title="Visualizar perfil"
                    onClick={() => navigate(`/mapa-turismo/operadora/${op.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>

                  {(op.approval_status === "pending" || op.approval_status === "rejected") && (
                    <Button
                      variant="default"
                      size="sm"
                      className="rounded-xl gap-1"
                      disabled={approveMutation.isPending}
                      onClick={() => approveMutation.mutate(op.id)}
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Aprovar
                    </Button>
                  )}

                  {(op.approval_status === "pending" || op.approval_status === "approved") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl gap-1 text-destructive hover:text-destructive"
                      onClick={() => {
                        setRejectTarget({ id: op.id, name: op.name });
                        setRejectDialogOpen(true);
                      }}
                    >
                      <XCircle className="h-3.5 w-3.5" />
                      Rejeitar
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Rejeitar cadastro</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Tem certeza que deseja rejeitar o cadastro de <strong>{rejectTarget?.name}</strong>?
          </p>
          <Textarea
            placeholder="Motivo da rejeição (opcional)"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            className="rounded-xl"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" className="rounded-xl" onClick={() => setRejectDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              className="rounded-xl"
              disabled={rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget) {
                  rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason });
                }
              }}
            >
              {rejectMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-1" />}
              Confirmar Rejeição
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
