import { Download, Share2, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

export function InstallWalletButton({ agencyName }: { agencyName?: string }) {
  const { triggerInstall, showInstructions, setShowInstructions, platform, isStandalone } = useInstallPrompt();

  if (isStandalone) return null;

  const handleClick = async () => {
    await triggerInstall();
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all px-4 py-3 text-sm font-semibold active:scale-95"
        aria-label="Salvar na tela inicial"
      >
        <Download className="h-4 w-4" />
        Salvar na tela inicial
      </button>

      <Dialog open={showInstructions} onOpenChange={setShowInstructions}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Salvar na tela inicial</DialogTitle>
            <DialogDescription>
              Tenha acesso rápido a {agencyName || "esta carteira"} direto da tela inicial do seu celular.
            </DialogDescription>
          </DialogHeader>

          {platform === "ios" && (
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
                <span>Toque no ícone <Share2 className="inline h-4 w-4 align-text-bottom" /> <strong>Compartilhar</strong> na barra do Safari.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
                <span>Role e toque em <strong>Adicionar à Tela de Início</strong> <Plus className="inline h-4 w-4 align-text-bottom" />.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">3</span>
                <span>Confirme em <strong>Adicionar</strong>. Pronto, o ícone aparece como um app.</span>
              </li>
            </ol>
          )}

          {platform === "android" && (
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
                <span>Toque no menu <MoreVertical className="inline h-4 w-4 align-text-bottom" /> no canto superior direito do navegador.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
                <span>Toque em <strong>Adicionar à tela inicial</strong> ou <strong>Instalar app</strong>.</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">3</span>
                <span>Confirme. O atalho aparece junto com seus aplicativos.</span>
              </li>
            </ol>
          )}

          {platform === "desktop" && (
            <ol className="space-y-3 text-sm text-foreground">
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
                <span>No celular, abra esta página pelo navegador (Chrome ou Safari).</span>
              </li>
              <li className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
                <span>Use o menu do navegador e escolha <strong>Adicionar à tela inicial</strong>.</span>
              </li>
            </ol>
          )}

          <Button onClick={() => setShowInstructions(false)} className="w-full mt-2">Entendi</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}