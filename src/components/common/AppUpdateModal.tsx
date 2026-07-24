import { useEffect, useRef, useState } from "react";
import { RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  useAppVersion,
  performAppUpdate,
  hasUnsavedChanges,
  dismissAppUpdate,
} from "@/hooks/useAppVersion";

/**
 * Non-destructive update prompt. Detects a new deployed version and
 * lets the user choose when to reload. Never reloads without an
 * explicit action and never appears on public / white-label routes.
 */
export function AppUpdateModal() {
  const { updateAvailable, remoteVersion } = useAppVersion();
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [confirmUnsaved, setConfirmUnsaved] = useState(false);
  const toastShownForRef = useRef<string | null>(null);

  // When a new version is detected, decide whether to open the modal
  // right away or fall back to a discreet, non-blocking toast when the
  // user is in the middle of unsaved edits.
  useEffect(() => {
    if (!updateAvailable || !remoteVersion) return;
    if (hasUnsavedChanges()) {
      if (toastShownForRef.current === remoteVersion) return;
      toastShownForRef.current = remoteVersion;
      toast("Nova versão disponível. Salve seu trabalho antes de atualizar.", {
        duration: 12000,
        action: {
          label: "Ver opções",
          onClick: () => setOpen(true),
        },
      });
      return;
    }
    setOpen(true);
  }, [updateAvailable, remoteVersion]);

  if (!updateAvailable || !remoteVersion) return null;

  const handleDismiss = () => {
    dismissAppUpdate(remoteVersion);
    setOpen(false);
  };

  const runUpdate = async () => {
    setUpdating(true);
    try {
      await performAppUpdate();
    } catch {
      /* performAppUpdate always reloads in finally */
    }
  };

  const handleUpdateClick = () => {
    if (updating) return;
    if (hasUnsavedChanges()) {
      setConfirmUnsaved(true);
      return;
    }
    void runUpdate();
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) handleDismiss();
        }}
      >
        <DialogContent className="sm:max-w-md rounded-2xl bg-white shadow-xl border-0 z-[100]">
          <div className="flex flex-col items-center text-center gap-4 py-2">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <RefreshCw className="h-6 w-6 text-primary" aria-hidden="true" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">
                Nova versão disponível
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Disponibilizamos uma nova versão do Agentes de Sonhos.
                Você pode atualizar agora ou continuar trabalhando e
                fazer isso depois. Antes de atualizar, salve suas alterações.
              </p>
            </div>

            <div className="w-full flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 mt-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleDismiss}
                disabled={updating}
                className="w-full sm:flex-1"
                size="lg"
              >
                Fazer depois
              </Button>
              <Button
                type="button"
                onClick={handleUpdateClick}
                disabled={updating}
                className="w-full sm:flex-1"
                size="lg"
              >
                {updating ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar agora"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmUnsaved} onOpenChange={setConfirmUnsaved}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
              Existem alterações não salvas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Se você atualizar agora, as alterações que ainda não foram
              salvas poderão ser perdidas. Volte, salve seu trabalho e
              atualize depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={updating}>Voltar e salvar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                setConfirmUnsaved(false);
                void runUpdate();
              }}
              disabled={updating}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Atualizar mesmo assim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default AppUpdateModal;