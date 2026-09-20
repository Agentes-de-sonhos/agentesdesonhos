import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Centered content container used EXCLUSIVELY by the Dashboard (home) page.
 *
 * - Full-width on mobile so edge-to-edge dashboard sections are never clipped.
 * - From desktop, fluid until 1560px with centered progressive gutters.
 * - `@container` so inner cards can react to the real available width instead of
 *   the viewport (the sidebar collapsed/expanded changes the usable area).
 *
 * Must NOT be applied to operational routes (CRM, tables, etc.).
 */
export const DASHBOARD_CONTAINER_CLASS =
  "@container mx-auto w-full min-w-0 lg:w-[calc(100%_-_clamp(32px,4vw,80px))] lg:max-w-[1560px]";

export function DashboardContainer({ children, className }: DashboardContainerProps) {
  return <div className={cn(DASHBOARD_CONTAINER_CLASS, className)}>{children}</div>;
}