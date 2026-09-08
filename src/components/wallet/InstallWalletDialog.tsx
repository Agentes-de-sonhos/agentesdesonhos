import { Share2, Plus, MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { InstallPlatform } from "@/hooks/useInstallPrompt";
import { tWallet } from "@/i18n/publicMaterials/wallet";
import type { PublicLocale } from "@/i18n/publicMaterials/locale";

interface InstallWalletDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  platform: InstallPlatform;
  agencyName?: string;
  locale?: PublicLocale;
}

export function InstallWalletDialog({ open, onOpenChange, platform, agencyName, locale = "pt-BR" }: InstallWalletDialogProps) {
  const t = tWallet(locale);
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("saveToHomeScreen")}</DialogTitle>
          <DialogDescription>
            {t("installDesc", { agency: agencyName || t("installFallbackAgency") })}
          </DialogDescription>
        </DialogHeader>

        {platform === "ios" && (
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
              <span>{t("installIosStep1a")} <Share2 className="inline h-4 w-4 align-text-bottom" /> <strong>{t("installIosStep1b")}</strong> {t("installIosStep1c")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
              <span>{t("installIosStep2a")} <strong>{t("installIosStep2b")}</strong> <Plus className="inline h-4 w-4 align-text-bottom" />.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">3</span>
              <span>{t("installIosStep3a")} <strong>{t("installIosStep3b")}</strong>. {t("installIosStep3c")}</span>
            </li>
          </ol>
        )}

        {platform === "android" && (
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
              <span>{t("installAndroidStep1")} <MoreVertical className="inline h-4 w-4 align-text-bottom" /></span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
              <span>{t("installAndroidStep2a")} <strong>{t("installAndroidStep2b1")}</strong> {t("installAndroidStep2or")} <strong>{t("installAndroidStep2b2")}</strong>.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">3</span>
              <span>{t("installAndroidStep3")}</span>
            </li>
          </ol>
        )}

        {platform === "desktop" && (
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">1</span>
              <span>{t("installDesktopStep1")}</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs">2</span>
              <span>{t("installDesktopStep2a")} <strong>{t("installDesktopStep2b")}</strong>.</span>
            </li>
          </ol>
        )}

        <Button onClick={() => onOpenChange(false)} className="w-full mt-2">{t("installConfirmBtn")}</Button>
      </DialogContent>
    </Dialog>
  );
}
