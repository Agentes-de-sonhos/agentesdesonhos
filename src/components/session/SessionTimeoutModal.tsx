import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSessionTimeout } from "@/hooks/useSessionTimeout";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";

export function SessionTimeoutModal() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { showWarning, countdown, continueSession, requestLogout, timedOut } =
    useSessionTimeout(!!user);

  const handleLogout = async () => {
    requestLogout();
    await signOut();
    navigate("/auth", { state: { message: "Sessão encerrada por inatividade" } });
  };

  // Auto-logout when countdown reaches 0
  useEffect(() => {
    if (timedOut) {
      handleLogout();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timedOut]);

  if (!user) return null;

  return (
    <Dialog open={showWarning} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm gap-0 p-0 overflow-hidden border-0 [&>button:last-child]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center p-6 space-y-4">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Clock className="h-7 w-7 text-primary" />
          </div>

          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Você ainda está aí?</DialogTitle>
            <DialogDescription className="text-sm text-muted-foreground leading-relaxed">
              Por segurança, sua sessão será encerrada em breve devido à
              inatividade.
            </DialogDescription>
          </DialogHeader>

          {/* Countdown */}
          <div className="py-3">
            <div className="text-3xl font-bold tabular-nums text-destructive">
              {countdown}s
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Encerrando em {countdown} segundo{countdown !== 1 ? "s" : ""}…
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col w-full gap-2">
            <Button size="lg" className="w-full" onClick={continueSession}>
              Continuar conectado
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="w-full"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sair agora
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
