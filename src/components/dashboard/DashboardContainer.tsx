import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DashboardContainerProps {
  children: ReactNode;
  className?: string;
}

/**
 * Centered content container used EXCLUSIVELY by the Dashboard (home) page.
 *
 * - Fluid until 1560px, then the excess width becomes centered lateral margin.
 * - Gutters grow progressively: clamp(32px, 4vw, 80px) total (16-40px per side).
 * - `@container` so inner cards can react to the real available width instead of
 *   the viewport (the sidebar collapsed/expanded changes the usable area).
 *
 * Must NOT be applied to operational routes (CRM, tables, etc.).
 */
export const DASHBOARD_CONTAINER_CLASS =
  "@container mx-auto w-[calc(100%_-_clamp(32px,4vw,80px))] max-w-[1560px] min-w-0";

export function DashboardContainer({ children, className }: DashboardContainerProps) {
  return <div className={cn(DASHBOARD_CONTAINER_CLASS, className)}>{children}</div>;
}