import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useKanbanMaximize } from "./KanbanMaximizeContext";

/**
 * Superfície que delimita a área maximizada dos funis.
 * No modo maximizado é renderizada em um portal no body (camada fixa inset-0),
 * evitando que transformações/offsets da página original desloquem o conteúdo
 * e garantindo que nenhuma parte da navegação principal apareça.
 */
export function KanbanMaximizeSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMaximized } = useKanbanMaximize();

  const content = (
    <div
      data-testid="kanban-maximize-surface"
      data-maximized={isMaximized ? "true" : "false"}
      className={cn(
        isMaximized &&
          "fixed inset-0 z-[200] flex h-[100dvh] w-screen flex-col overflow-hidden bg-background px-3 py-3",
        className
      )}
    >
      {children}
    </div>
  );

  if (isMaximized && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
