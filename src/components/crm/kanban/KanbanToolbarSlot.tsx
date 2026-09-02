import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useKanbanMaximize } from "./KanbanMaximizeContext";

/**
 * Renderiza os controles da aba ativa (busca, filtros, criar, minimizar) na
 * mesma linha do menu de abas, quando o slot compartilhado existe.
 * Sem slot (ex.: página /crm legada), mantém o comportamento inline anterior.
 */
export function KanbanToolbarSlot({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { toolbarEl } = useKanbanMaximize();

  if (toolbarEl) {
    return createPortal(
      <div className={cn("flex min-w-0 items-center gap-1.5", className)}>{children}</div>,
      toolbarEl
    );
  }

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>{children}</div>
  );
}
