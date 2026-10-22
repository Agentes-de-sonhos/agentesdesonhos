import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";

/**
 * Padrão oficial de pop-ups (referência: janela "Passagem Aérea").
 * Janela cinza-clara → cartão branco com borda suave → cabeçalho com ícone,
 * título em caixa alta e campos com fundo cinza-claro.
 */
export const standardPopupContentClass = "bg-muted border-0 sm:p-4 md:p-4";

export function StandardPopupCard({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card p-4 sm:p-6 shadow-sm",
        "[&_input:not([type=checkbox]):not([type=radio]):not([type=file])]:bg-muted",
        "[&_textarea]:bg-muted",
        "[&_button[role=combobox]]:bg-muted",
        className,
      )}
    >
      {children}
    </div>
  );
}

export function StandardPopupHeader({
  icon: Icon,
  title,
  subtitle,
  rightSlot,
}: {
  icon: LucideIcon;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  rightSlot?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3 pb-4 mb-4 border-b border-border pr-6">
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-primary/30 bg-primary/10 shrink-0">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <div className="min-w-0 text-left">
          <DialogTitle className="text-xs font-semibold uppercase tracking-wide text-primary leading-normal break-words">
            {title}
          </DialogTitle>
          {subtitle ? (
            <DialogDescription className="text-sm text-muted-foreground leading-tight break-words">
              {subtitle}
            </DialogDescription>
          ) : null}
        </div>
      </div>
      {rightSlot}
    </div>
  );
}
