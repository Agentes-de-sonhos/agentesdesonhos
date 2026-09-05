import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { PortalContainerProvider } from "@/components/ui/portal-container-context";
import { claimToastHost, releaseToastHost } from "@/components/ui/toast-host";
import { useKanbanMaximize } from "./KanbanMaximizeContext";


/**
 * Superfície que delimita a área maximizada dos funis.
 * No modo maximizado é renderizada em um portal no body (camada fixa inset-0),
 * evitando que transformações/offsets da página original desloquem o conteúdo
 * e garantindo que nenhuma parte da navegação principal apareça.
 * O mesmo elemento é o alvo da Fullscreen API.
 *
 * Além disso, quando maximizada, a superfície passa a ser o container dos
 * Portals do Radix (menus, selects, diálogos, sheets, tooltips). Isso é
 * necessário porque, em fullscreen nativo, nada fora do elemento em tela cheia
 * é exibido — e no fallback `fixed` os overlays ficariam atrás da superfície.
 */
export function KanbanMaximizeSurface({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { isMaximized, registerSurface } = useKanbanMaximize();
  const [surfaceEl, setSurfaceEl] = useState<HTMLElement | null>(null);
  const ownerRef = useRef({});

  const setRef = useCallback(
    (node: HTMLDivElement | null) => {
      registerSurface(node);
      setSurfaceEl(node);
    },
    [registerSurface]
  );

  // Enquanto maximizada, os toasts (shadcn e Sonner) passam a renderizar dentro
  // desta superfície; ao sair/Esc/desmontar/trocar de aba voltam ao padrão.
  useEffect(() => {
    const owner = ownerRef.current;
    if (isMaximized && surfaceEl) claimToastHost(owner, surfaceEl);
    else releaseToastHost(owner);
    return () => releaseToastHost(owner);
  }, [isMaximized, surfaceEl]);



  const content = (
    <div
      ref={setRef}
      data-testid="kanban-maximize-surface"
      data-maximized={isMaximized ? "true" : "false"}
      className={cn(
        isMaximized &&
          "fixed inset-0 z-[200] flex h-[100dvh] max-h-[100dvh] w-screen flex-col overflow-hidden bg-background px-3 py-2",
        className
      )}
    >
      <PortalContainerProvider container={isMaximized ? surfaceEl : null}>
        {children}
      </PortalContainerProvider>
    </div>
  );

  if (isMaximized && typeof document !== "undefined") {
    return createPortal(content, document.body);
  }

  return content;
}
