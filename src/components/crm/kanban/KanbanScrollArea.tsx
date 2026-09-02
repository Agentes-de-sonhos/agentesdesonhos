import { forwardRef, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { useKanbanMaximize } from "./KanbanMaximizeContext";

/**
 * Contêiner de rolagem compartilhado pelos funis (Oportunidades e Operações).
 * - Arraste com o mouse (grab/grabbing) na área de fundo do quadro, horizontal e vertical.
 * - Uma única barra de rolagem horizontal nativa, no limite inferior da área do funil
 *   (ou da área maximizada), sincronizada com o arraste.
 */
const INTERACTIVE_SELECTOR =
  'button, a, input, textarea, select, label, [contenteditable="true"], [role="menu"], [role="menuitem"], [role="dialog"], [role="combobox"], [role="tab"], [draggable="true"], [data-no-kanban-drag]';

export const KanbanScrollArea = forwardRef<HTMLDivElement, {
  children: React.ReactNode;
  className?: string;
}>(function KanbanScrollArea({ children, className }, forwardedRef) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const start = useRef({ x: 0, y: 0, left: 0, top: 0 });

  const setRefs = useCallback(
    (node: HTMLDivElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) (forwardedRef as React.MutableRefObject<HTMLDivElement | null>).current = node;
    },
    [forwardedRef]
  );

  const { isMaximized } = useKanbanMaximize();

  const stopDrag = useCallback(() => {
    dragging.current = false;
    const el = innerRef.current;
    if (el) {
      el.style.cursor = "";
      el.style.userSelect = "";
    }
  }, []);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    const el = innerRef.current;
    if (!el || e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest(INTERACTIVE_SELECTOR)) return;
    dragging.current = true;
    start.current = { x: e.pageX, y: e.pageY, left: el.scrollLeft, top: el.scrollTop };
    el.style.cursor = "grabbing";
    el.style.userSelect = "none";
  }, []);

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    const el = innerRef.current;
    if (!dragging.current || !el) return;
    e.preventDefault();
    el.scrollLeft = start.current.left - (e.pageX - start.current.x) * 1.2;
    el.scrollTop = start.current.top - (e.pageY - start.current.y) * 1.2;
  }, []);

  return (
    <div
      ref={setRefs}
      data-testid="kanban-scroll-area"
      className={cn(
        // Única área de rolagem do funil: horizontal (colunas) e vertical (cards).
        "overflow-x-auto overflow-y-auto overscroll-x-contain cursor-grab touch-pan-x scrollbar-thin scrollbar-thumb-muted-foreground/30 scrollbar-track-transparent",
        isMaximized
          ? "h-full min-h-0 flex-1"
          : "min-h-[calc(100dvh-15rem)] max-h-[calc(100dvh-15rem)]",
        className
      )}

      style={{ scrollbarWidth: "thin" }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
    >

      {children}
    </div>
  );
});
