import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { parseFunctionsError, formatCancelDate } from "@/lib/subscriptionCancel";
import { parsePortalError } from "@/lib/customerPortal";
import { getScheduledCancellation } from "@/lib/subscriptionState";
import {
  CalendarClock,
  CreditCard,
  ExternalLink,
  Loader2,
  Layers,
  Receipt,
  ShieldCheck,
  Users,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import {
  getWorkspacePref,
  setWorkspacePref,
  isWorkspaceEligible,
} from "@/workspace/featureFlag";
import { usePermissions } from "@/hooks/usePermissions";
import { useTeamQuota } from "@/hooks/useTeamMembers";
import { TeamMembersDialog } from "@/components/team/TeamMembersDialog";

export default function MinhaConta() {
  const { user } = useAuth();
  const { plan, getPlanLabel, subscription, refetch } = useSubscription();
  const { role } = useUserRole();
  const [loadingPortal, setLoadingPortal] = useState<null | "manage" | "cancel">(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const { isMaster, can } = usePermissions();
  const canManageTeam = isMaster || can("team.manage");
  const { data: teamQuota } = useTeamQuota();
  // Default ON for eligible users; only "off" disables.
  const [tabsEnabled, setTabsEnabled] = useState<boolean>(() => getWorkspacePref() !== "off");
  useEffect(() => {
    setTabsEnabled(getWorkspacePref() !== "off");
  }, []);
  const workspaceEligible = isWorkspaceEligible(role, plan);

  const handleToggleTabs = (next: boolean) => {
    setTabsEnabled(next);
    setWorkspacePref(next ? "on" : "off");
    toast.success(
      next
        ? "Workspace com Abas ativado. Recarregando…"
        : "Workspace com Abas desativado. Recarregando…",
    );
    setTimeout(() => window.location.reload(), 400);
  };

  const isPaid = plan === "profissional" || plan === "premium" || plan === "fundador";
  const cancellation = getScheduledCancellation(subscription as any);

  const openPortal = async (mode: "manage" | "cancel") => {
    // Abre uma janela placeholder no gesto do clique para não ser bloqueada
    // pelo navegador depois do await.
    const placeholder = window.open("", "_blank");
    try {
      setLoadingPortal(mode);
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { mode },
      });
      if (error) throw new Error(await parsePortalError(error));
      if (!data?.url) throw new Error(await parsePortalError({ context: data }));
      if (placeholder && !placeholder.closed) {
        placeholder.location.href = data.url;
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      if (placeholder && !placeholder.closed) placeholder.close();
      toast.error(err?.message || (await parsePortalError(err)));
    } finally {
      setLoadingPortal(null);
    }
  };

  const handleCancelSubscription = async () => {
    try {
      setLoadingPortal("cancel");
      const { data, error } = await supabase.functions.invoke("cancel-subscription", {
        body: { reason: cancelReason.trim() },
      });
      if (error) {
        throw new Error(await parseFunctionsError(error));
      }
      if (!data?.success) {
        throw new Error(await parseFunctionsError({ context: data }));
      }
      const endDate = formatCancelDate(data.cancel_at);
      if (data.already_scheduled) {
        toast.info(
          endDate
            ? `Seu cancelamento já estava agendado. O acesso vai até ${endDate}.`
            : "Seu cancelamento já estava agendado."
        );
      } else {
        toast.success(
          endDate
            ? `Assinatura cancelada. Seu acesso permanece ativo até ${endDate}.`
            : "Assinatura cancelada. Seu acesso permanece ativo até o fim do período já pago."
        );
      }
      setConfirmCancel(false);
      setCancelReason("");
      await refetch();
    } catch (err: any) {
      toast.error(err?.message || "Erro ao cancelar assinatura.");
    } finally {
      setLoadingPortal(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Minha Conta</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua conta, equipe, permissões, assinatura e dados de cobrança.
          </p>
        </div>

        {/* Plano atual */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                  Plano atual
                </CardTitle>
                <CardDescription className="mt-1">
                  E-mail da conta: <span className="font-medium">{user?.email}</span>
                </CardDescription>
              </div>
              <Badge variant="secondary" className="text-sm">
                {getPlanLabel(plan)}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!isPaid && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border bg-muted/30 p-4">
                <p className="text-sm text-muted-foreground">
                  Você está no plano gratuito. Faça upgrade para desbloquear mais recursos.
                </p>
                <Button asChild>
                  <Link to="/planos">Ver planos</Link>
                </Button>
              </div>
            )}

            {isPaid && subscription?.expires_at && (
              <p className="text-sm text-muted-foreground">
                Próxima renovação: {new Date(subscription.expires_at).toLocaleDateString("pt-BR")}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Equipe e Permissões */}
        {canManageTeam && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Equipe e Permissões
              </CardTitle>
              <CardDescription>
                Cadastre colaboradores com login próprio e defina o que cada um acessa,
                quais dados enxerga e em quais etapas do funil pode atuar.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-lg border p-3">
                  <p className="text-xl font-semibold leading-none">
                    {teamQuota ? `${teamQuota.used}/${teamQuota.total}` : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">Acessos utilizados</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xl font-semibold leading-none">{teamQuota?.pending ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">Convites pendentes</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xl font-semibold leading-none">{getPlanLabel(plan)}</p>
                  <p className="text-xs text-muted-foreground">Limite conforme o plano</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Também disponível em Gestão de Clientes e Gestão Financeira.
                </p>
                <Button onClick={() => setTeamDialogOpen(true)}>
                  Gerenciar equipe e permissões
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Preferências de Navegação */}
        {workspaceEligible && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-primary" />
                Preferências de Navegação
              </CardTitle>
              <CardDescription>
                Personalize como você navega entre as telas do sistema.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <Label htmlFor="workspace-tabs" className="text-sm font-medium">
                    Workspace com Abas
                  </Label>
                  <p className="text-xs text-muted-foreground max-w-md">
                    Permite abrir várias telas do sistema ao mesmo tempo em abas internas,
                    preservando o estado de cada uma. Limite de 10 abas simultâneas.
                  </p>
                </div>
                <Switch
                  id="workspace-tabs"
                  checked={tabsEnabled}
                  onCheckedChange={handleToggleTabs}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Gerenciar assinatura */}
        {isPaid && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Gerenciar assinatura
              </CardTitle>
              <CardDescription>
                Atualize forma de pagamento, baixe faturas ou cancele sua assinatura. Você será
                redirecionado para o portal seguro do nosso processador de pagamentos.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Button
                  variant="outline"
                  className="justify-start h-auto py-4"
                  onClick={() => openPortal("manage")}
                  disabled={loadingPortal !== null}
                >
                  {loadingPortal === "manage" ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Receipt className="h-4 w-4 mr-2" />
                  )}
                  <div className="text-left">
                    <div className="font-medium flex items-center gap-1">
                      Pagamentos e faturas
                      <ExternalLink className="h-3 w-3" />
                    </div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Cartão, histórico e recibos
                    </div>
                  </div>
                </Button>

                <Button
                  variant="outline"
                  className="justify-start h-auto py-4 text-destructive hover:text-destructive hover:bg-destructive/5 border-destructive/20"
                  onClick={() => setConfirmCancel(true)}
                  disabled={loadingPortal !== null}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  <div className="text-left">
                    <div className="font-medium">Cancelar assinatura</div>
                    <div className="text-xs text-muted-foreground font-normal">
                      Acesso mantido até o fim do período pago
                    </div>
                  </div>
                </Button>
              </div>

              <p className="text-xs text-muted-foreground pt-2">
                Ao cancelar, você continua com acesso completo até o fim do período já pago. Não há
                cobranças adicionais após o cancelamento.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {canManageTeam && (
        <TeamMembersDialog open={teamDialogOpen} onOpenChange={setTeamDialogOpen} />
      )}

      <Dialog
        open={confirmCancel}
        onOpenChange={(open) => {
          if (loadingPortal === "cancel") return;
          setConfirmCancel(open);
          if (!open) setCancelReason("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar assinatura?</DialogTitle>
            <DialogDescription>
              Sentimos muito em ver você partir. Seu acesso permanece ativo até o fim do período já
              pago — sem novas cobranças após o cancelamento.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="cancel-reason" className="text-sm">
              Nos conte o motivo do cancelamento (opcional)
            </Label>
            <Textarea
              id="cancel-reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Sua opinião nos ajuda a melhorar a plataforma. Se puder, compartilhe o que motivou sua decisão."
              rows={4}
              maxLength={1000}
              disabled={loadingPortal === "cancel"}
            />
            <p className="text-xs text-muted-foreground">
              {cancelReason.length}/1000 caracteres
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setConfirmCancel(false)}
              disabled={loadingPortal === "cancel"}
            >
              Manter assinatura
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancelSubscription}
              disabled={loadingPortal === "cancel"}
            >
              {loadingPortal === "cancel" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Cancelando...
                </>
              ) : (
                "Confirmar cancelamento"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
