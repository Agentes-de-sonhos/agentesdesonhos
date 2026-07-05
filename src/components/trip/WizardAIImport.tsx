import { Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { GenericServiceSmartImport, type GenericServiceKey } from "@/components/quote/service-import/GenericServiceSmartImport";
import { SERVICE_IMPORT_CONFIGS } from "@/components/quote/service-import/serviceImportConfigs";
import { CarRentalSmartImport } from "@/components/quote/car-rental-import/CarRentalSmartImport";

export type WizardAccent =
  | "sky" | "amber" | "emerald" | "indigo" | "pink" | "rose" | "fuchsia";

const ACCENT_MAP: Record<WizardAccent, { badge: string; ring: string }> = {
  sky:     { badge: "bg-sky-50 text-sky-700 border-sky-200 hover:bg-sky-100",         ring: "focus-visible:ring-sky-500" },
  amber:   { badge: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100", ring: "focus-visible:ring-amber-500" },
  emerald: { badge: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100", ring: "focus-visible:ring-emerald-500" },
  indigo:  { badge: "bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100", ring: "focus-visible:ring-indigo-500" },
  pink:    { badge: "bg-pink-50 text-pink-700 border-pink-200 hover:bg-pink-100",     ring: "focus-visible:ring-pink-500" },
  rose:    { badge: "bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100",     ring: "focus-visible:ring-rose-500" },
  fuchsia: { badge: "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 hover:bg-fuchsia-100", ring: "focus-visible:ring-fuchsia-500" },
};

export function WizardAIImportButton({
  onClick, accent, label = "Importar com IA",
}: { onClick: () => void; accent: WizardAccent; label?: string }) {
  const a = ACCENT_MAP[accent];
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold shadow-sm transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1",
        a.badge, a.ring,
      )}
      aria-label={label}
    >
      <Sparkles className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{label}</span>
      <span className="sm:hidden">IA</span>
    </button>
  );
}

/**
 * Portals its children into the modal header slot rendered by the parent
 * dialog (e.g. Carteira Digital service dialog). Falls back to rendering
 * inline when no slot is present in the DOM.
 *
 * Target slot id: `wallet-wizard-ai-slot`.
 */
export function WizardHeaderPortal({ children }: { children: React.ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (typeof document === "undefined") return;
    const el = document.getElementById("wallet-wizard-ai-slot");
    setTarget(el);
    if (!el) return;
    // Re-check on next tick in case the slot mounts after this form
    const t = window.setTimeout(() => {
      setTarget(document.getElementById("wallet-wizard-ai-slot"));
    }, 0);
    return () => window.clearTimeout(t);
  }, []);
  if (!target) return <>{children}</>;
  return createPortal(children, target);
}

interface DialogWrapperProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

function ImportDialogShell({ open, onOpenChange, title, description, children }: DialogWrapperProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl w-[95vw] max-h-[92vh] sm:max-h-[88vh] p-0 gap-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-3 border-b shrink-0">
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
          {children}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Generic wallet AI import dialog for services that use GenericServiceSmartImport. */
export function WalletGenericImportDialog({
  open, onOpenChange, serviceKey, title, description, onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  serviceKey: GenericServiceKey;
  title: string;
  description?: string;
  /** Raw parsed data (Portuguese keys) returned by the AI. */
  onApply: (parsed: Record<string, any>) => void;
}) {
  const cfg = SERVICE_IMPORT_CONFIGS[serviceKey];
  return (
    <ImportDialogShell open={open} onOpenChange={onOpenChange} title={title} description={description}>
      <GenericServiceSmartImport
        serviceType={serviceKey}
        serviceLabel={cfg.serviceLabel}
        fields={cfg.fields}
        mapToInitialData={cfg.mapToInitialData}
        onCancel={() => onOpenChange(false)}
        onConfirm={(_mapped, raw) => { onApply(raw); onOpenChange(false); }}
      />
    </ImportDialogShell>
  );
}

/** Car rental uses a dedicated smart import (like Orçamentos). */
export function WalletCarRentalImportDialog({
  open, onOpenChange, onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onApply: (mapped: Record<string, any>) => void;
}) {
  return (
    <ImportDialogShell
      open={open}
      onOpenChange={onOpenChange}
      title="Importar locação com IA"
      description="Envie o voucher (PDF, imagem ou texto). A IA identifica locadora, retirada, devolução e valores. Você poderá revisar antes de salvar."
    >
      <CarRentalSmartImport
        onCancel={() => onOpenChange(false)}
        onConfirm={(_mapped, raw) => { onApply(raw as any); onOpenChange(false); }}
      />
    </ImportDialogShell>
  );
}

export { ImportDialogShell };