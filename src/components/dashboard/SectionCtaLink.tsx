import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface SectionCtaLinkProps {
  to: string;
  /** Full label (desktop) */
  label: string;
  /** Compact label used on small screens */
  shortLabel?: string;
  /** Tab title used by the internal window system */
  tabTitle: string;
  /** Tailwind color classes for the link text */
  className?: string;
}

/**
 * Standard dashboard block CTA: sits at the top-right of the block header and
 * opens the target page through the app's internal window/tab system.
 */
export function SectionCtaLink({ to, label, shortLabel, tabTitle, className }: SectionCtaLinkProps) {
  return (
    <Link
      to={to}
      data-workspace-menu=""
      data-workspace-title={tabTitle}
      aria-label={label}
      className={cn(
        "text-xs sm:text-sm font-medium hover:underline inline-flex items-center gap-1 flex-shrink-0 mt-1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded",
        className,
      )}
    >
      <span className={shortLabel ? "hidden sm:inline" : undefined}>{label}</span>
      {shortLabel && <span className="sm:hidden">{shortLabel}</span>}
      <ArrowRight className="h-3.5 w-3.5" />
    </Link>
  );
}
