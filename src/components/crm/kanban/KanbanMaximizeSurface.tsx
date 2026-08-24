import { cn } from "@/lib/utils";
import { useKanbanMaximize } from "./KanbanMaximizeContext";

/**
 * Superfície que delimita a área maximizada dos funis: começa na linha das abas
 * e ocupa todo o espaço útil disponível (sem Fullscreen API do navegador).
 */
export function KanbanMaximizeSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMaximized } = useKanbanMaximize();
  return (
    <div
      data-testid="kanban-maximize-surface"
      data-maximized={isMaximized ? "true" : "false"}
      className={cn(
        isMaximized && "fixed inset-0 z-40 flex flex-col overflow-hidden bg-background p-4",
        className
      )}
    >
      {children}
    </div>
  );
}
