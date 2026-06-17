import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallWalletDialog } from "./InstallWalletDialog";

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
        className="fixed bottom-4 right-4 z-40 inline-flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-lg hover:shadow-xl transition-all px-4 py-3 text-sm font-semibold active:scale-95 md:hidden"
        aria-label="Salvar na tela inicial"
      >
        <Download className="h-4 w-4" />
        Salvar na tela inicial
      </button>

      <InstallWalletDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
        platform={platform}
        agencyName={agencyName}
      />
    </>
  );
}