import { Download } from "lucide-react";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";
import { InstallWalletDialog } from "./InstallWalletDialog";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import type { PublicLocale } from "@/i18n/publicMaterials/locale";

export function InstallWalletButton({ agencyName, locale = "pt-BR" }: { agencyName?: string; locale?: PublicLocale }) {
  const t = tWallet(locale);
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
        aria-label={t("saveToHomeScreen")}
      >
        <Download className="h-4 w-4" />
        {t("saveToHomeScreen")}
      </button>

      <InstallWalletDialog
        open={showInstructions}
        onOpenChange={setShowInstructions}
        platform={platform}
        agencyName={agencyName}
        locale={locale}
      />
    </>
  );
}