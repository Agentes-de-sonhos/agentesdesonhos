import { useState } from "react";
import { RefreshCw, Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAppVersion, performAppUpdate, hasUnsavedChanges } from "@/hooks/useAppVersion";

/**
 * Shows a blocking modal whenever the version served by the CDN differs
 * from the version bundled in the running client. The user is walked
 * through a safe reload that clears technical caches and applies any
 * pending service worker without touching auth session or user data.
 */
export function AppUpdateModal() {
  const { updateAvailable } = useAppVersion();
  const [updating, setUpdating] = useState(false);
  const [unsavedWarning, setUnsavedWarning] = useState(false);

  if (!updateAvailable) return null;

  const handleUpdate = async () => {
    if (updating) return;
    if (hasUnsavedChanges()) {
      setUnsavedWarning(true);
      return;
    }
    setUpdating(true);
    try {
      await performAppUpdate();
    } catch {
      // performAppUpdate already forces a reload in its finally block;
      // this catch exists only to prevent an unhandled rejection.
    }
  };

  return (
    <Dialog open onOpenChange={() => { /* modal must not be dismissed */ }}>
      <DialogContent
        className="sm:max-w-md rounded-2xl bg-white shadow-xl border-0 z-[100]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <div className="flex flex-col items-center text-center gap-4 py-2">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <RefreshCw className="h-6 w-6 text-primary" aria-hidden="true" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">
              Plataforma atualizada
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Disponibilizamos uma nova versão do Agentes de Sonhos. Clique no
              botão abaixo para atualizar seu acesso e continuar utilizando a
              plataforma normalmente.
            </p>
          </div>

          {unsavedWarning && (
            <div
              className="w-full text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              role="alert"
            >
              Existem alterações que ainda não foram salvas. Salve suas
              informações antes de atualizar a plataforma.
            </div>
          )}

          <Button
            onClick={handleUpdate}
            disabled={updating}
            className="w-full mt-2"
            size="lg"
          >
            {updating ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Atualizando...
              </>
            ) : (
              "Atualizar plataforma"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AppUpdateModal;