import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  CreditCard,
  ExternalLink,
  Loader2,
  Receipt,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function MinhaConta() {
  const { user } = useAuth();
  const { plan, getPlanLabel, subscription } = useSubscription();
  const [loadingPortal, setLoadingPortal] = useState<null | "manage" | "cancel">(null);
  const [confirmCancel, setConfirmCancel] = useState(false);

  const isPaid = plan === "profissional" || plan === "premium" || plan === "fundador";

  const openPortal = async (mode: "manage" | "cancel") => {
    try {
      setLoadingPortal(mode);
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: { mode },
      });
      if (error) throw error;
      if (!data?.url) throw new Error("Não foi possível abrir o portal de gerenciamento.");
      window.open(data.url, "_blank");
    } catch (err: any) {
      const msg = err?.message || err?.context?.error || "Erro ao abrir o portal de assinatura.";
      toast.error(msg);
    } finally {
      setLoadingPortal(null);
      setConfirmCancel(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">Minha Conta</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie sua assinatura, pagamentos e dados de cobrança
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

      <AlertDialog open={confirmCancel} onOpenChange={setConfirmCancel}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
            <AlertDialogDescription>
              Você será direcionado para o portal seguro de cobrança, onde poderá confirmar o
              cancelamento e informar o motivo. Seu acesso permanece ativo até o fim do período já
              pago — sem novas cobranças.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loadingPortal !== null}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                openPortal("cancel");
              }}
              disabled={loadingPortal !== null}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loadingPortal === "cancel" ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Abrindo portal...
                </>
              ) : (
                "Continuar para o portal"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
