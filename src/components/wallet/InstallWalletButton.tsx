import { useEffect, useState } from "react";
import { Download, Share2, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function detectPlatform(): "ios" | "android" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return "ios";
  if (/android/.test(ua)) return "android";
  return "desktop";
}

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

export function InstallWalletButton({ agencyName }: { agencyName?: string }) {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState<boolean>(() => isStandalone());
  const platform = detectPlatform();

  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setHidden(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (hidden) return null;

  const handleClick = async () => {
    if (deferred) {
      try {
        await deferred.prompt();
        const choice = await deferred.userChoice;
        if (choice.outcome === "accepted") setHidden(true);
        setDeferred(null);
        return;
      } catch {
        // fallback to instructions
      }
    }
    setOpen(true);
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

      <Dialog open={open} onOpenChange={setOpen}>
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

          <Button onClick={() => setOpen(false)} className="w-full mt-2">Entendi</Button>
        </DialogContent>
      </Dialog>
    </>
  );
}