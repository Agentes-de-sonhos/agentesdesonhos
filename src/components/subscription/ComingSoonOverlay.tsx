import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Rocket } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const DISMISSED_KEY = "coming_soon_dismissed";
const LAUNCH_DATE_LABEL = "01 de abril";

function wasDismissed(pageKey: string): boolean {
  try {
    const stored = sessionStorage.getItem(DISMISSED_KEY);
    const dismissed: string[] = stored ? JSON.parse(stored) : [];
    return dismissed.includes(pageKey);
  } catch {
    return false;
  }
}

function markDismissed(pageKey: string): void {
  try {
    const stored = sessionStorage.getItem(DISMISSED_KEY);
    const dismissed: string[] = stored ? JSON.parse(stored) : [];
    if (!dismissed.includes(pageKey)) {
      dismissed.push(pageKey);
      sessionStorage.setItem(DISMISSED_KEY, JSON.stringify(dismissed));
    }
  } catch {
    // ignore
  }
}

interface ComingSoonOverlayProps {
  pageKey: string;
}

export function ComingSoonOverlay({ pageKey }: ComingSoonOverlayProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!wasDismissed(pageKey)) {
      setOpen(true);
    }
  }, [pageKey]);

  const handleClose = () => {
    markDismissed(pageKey);
    setOpen(false);
  };

  const handleGoHome = () => {
    markDismissed(pageKey);
    setOpen(false);
    navigate("/dashboard");
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md text-center gap-0 p-0 overflow-hidden border-0">
        {/* Header accent */}
        <div className="bg-gradient-to-br from-primary/20 via-primary/10 to-transparent pt-8 pb-4 px-6">
          <div className="mx-auto mb-3 flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 ring-4 ring-primary/5">
            <Rocket className="h-10 w-10 text-primary" />
          </div>
          <DialogHeader className="items-center space-y-1">
            <DialogTitle className="text-xl font-bold">
              🚀 Novidade chegando!
            </DialogTitle>
          </DialogHeader>
        </div>

        {/* Body */}
        <div className="px-6 pb-6 pt-4 space-y-4">
          <DialogDescription asChild>
            <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
              <p>
                Essa funcionalidade ainda está em desenvolvimento, mas já estamos
                finalizando tudo pra você!
              </p>
              <p>
                O lançamento oficial será no dia{" "}
                <span className="font-semibold text-foreground">
                  {LAUNCH_DATE_LABEL}
                </span>
                , e vai trazer ainda mais possibilidades para você vender mais,
                ganhar produtividade e aproveitar ao máximo o Agente de Sonhos.
              </p>
              <p>
                Obrigado por fazer parte dessa evolução com a gente 🙌
              </p>
            </div>
          </DialogDescription>

          <div className="flex flex-col gap-2 pt-2">
            <Button onClick={handleGoHome} size="lg" className="w-full">
              Voltar para a plataforma
            </Button>
            <Button
              onClick={handleClose}
              variant="outline"
              size="sm"
              className="w-full text-muted-foreground"
            >
              Quero ser avisado
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
