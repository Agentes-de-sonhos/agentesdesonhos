import { DEFAULT_PUBLIC_LOCALE, pluralize } from "@/i18n/publicMaterials/locale";
import { translateQuote } from "@/i18n/publicMaterials/quote";
import { useState } from "react";
import { ChevronDown, Layers, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Section accordion used on the public quote link. Starts collapsed and shows
 * the section name plus the number of services it contains. The header icon
 * follows the group's service type (plane for flights, hotel for lodging,
 * layers as the neutral fallback).
 */
export function PublicSectionAccordion({
  title,
  count,
  icon: Icon = Layers,
  children,
  defaultOpen = false,
  locale = DEFAULT_PUBLIC_LOCALE,
}: {
  title: string;
  count: number;
  icon?: LucideIcon;
  children: React.ReactNode;
  defaultOpen?: boolean;
  locale?: string;
}) {
  const t = translateQuote(locale);
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 overflow-hidden shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-4 sm:px-5 py-4 text-left hover:bg-muted/40 transition-colors"
      >
        <span className="shrink-0 h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="h-4 w-4 text-primary" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-foreground truncate">{title}</span>
          <span className="block text-xs text-muted-foreground">
            {count} {pluralize(locale, count, { one: t("serviceCountOne"), other: t("serviceCountOther") })}
          </span>
        </span>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-foreground transition-transform duration-200 shrink-0",
            open && "rotate-180",
          )}
        />
      </button>
      {open && <div className="px-3 sm:px-4 pb-4">{children}</div>}
    </div>
  );
}
