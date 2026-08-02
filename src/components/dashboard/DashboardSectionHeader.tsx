import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionCtaLink } from "./SectionCtaLink";

interface DashboardSectionHeaderProps {
  icon: LucideIcon;
  title: string;
  description: string;
  /** Tailwind text color class for the icon */
  iconClassName: string;
  /** Tailwind bg color class for the accent underline */
  accentClassName: string;
  cta: {
    to: string;
    label: string;
    shortLabel?: string;
    tabTitle: string;
    className?: string;
  };
  className?: string;
}

/**
 * Cabeçalho padrão dos blocos do Dashboard: título+ícone à esquerda,
 * frase descritiva centralizada no espaço intermediário e CTA à direita.
 * Em telas estreitas (container query) compõe em duas linhas:
 * título + CTA na primeira e frase centralizada na segunda.
 */
export function DashboardSectionHeader({
  icon: Icon,
  title,
  description,
  iconClassName,
  accentClassName,
  cta,
  className,
}: DashboardSectionHeaderProps) {
  return (
    <div
      className={cn(
        "@container mb-3 grid min-w-0 items-center gap-x-3 gap-y-2",
        "grid-cols-[auto_auto] justify-between",
        "@[44rem]:grid-cols-[auto_minmax(0,1fr)_auto] @[44rem]:gap-x-4 @[60rem]:gap-x-6",
        className,
      )}
    >
      <div className="min-w-0 shrink-0">
        <h2 className="font-display text-base sm:text-lg font-semibold text-foreground flex items-center gap-2 whitespace-nowrap">
          <Icon className={cn("h-5 w-5 shrink-0", iconClassName)} />
          {title}
        </h2>
        <div className={cn("mt-2 h-1 w-full rounded-full", accentClassName)} />
      </div>

      <p className="order-last col-span-2 min-w-0 truncate text-center text-xs text-muted-foreground @[44rem]:order-none @[44rem]:col-span-1 @[44rem]:whitespace-nowrap @[60rem]:text-sm">
        {description}
      </p>

      <SectionCtaLink
        to={cta.to}
        label={cta.label}
        shortLabel={cta.shortLabel}
        tabTitle={cta.tabTitle}
        className={cn("whitespace-nowrap", cta.className)}
      />
    </div>
  );
}