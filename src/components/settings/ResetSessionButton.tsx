import { useState } from "react";
import { Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { resetUserSession } from "@/lib/resetUserSession";

interface ResetSessionButtonProps {
  variant?: "default" | "outline" | "destructive" | "secondary" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  redirectTo?: string;
  /** Optional label override */
  label?: string;
}

export function ResetSessionButton({
  variant = "outline",
  size = "default",
  className,
  redirectTo = "/auth",
  label = "Resetar sessão",
}: ResetSessionButtonProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleConfirm = async (e: React.MouseEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      toast.loading("Resetando sessão...", { id: "reset-session" });
      await resetUserSession({ redirectTo });
      toast.success("Sessão resetada. Redirecionando...", { id: "reset-session" });
    } catch (err) {
      console.error("[ResetSessionButton] failed", err);
      toast.error("Não foi possível resetar a sessão. Tente novamente.", {
        id: "reset-session",
      });
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
      <AlertDialogTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          <RefreshCw className="mr-2 h-4 w-4" />
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Resetar sessão?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <span className="block">
              Esta ação irá <strong>encerrar sua sessão local</strong>, limpar
              dados temporários da plataforma armazenados no seu navegador (cache,
              rascunhos, sessão) e redirecioná-lo para a tela de login.
            </span>
            <span className="block">
              Use quando estiver enfrentando comportamentos estranhos como tela
              em branco, telas que não carregam ou erros que persistem mesmo após
              recarregar.
            </span>
            <span className="block text-xs text-muted-foreground">
              Seus dados na plataforma <strong>não serão afetados</strong>. Você
              só precisará fazer login novamente.
            </span>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Confirmar reset
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
