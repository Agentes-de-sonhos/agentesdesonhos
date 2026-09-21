import * as React from "react";
import { X } from "lucide-react";

import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface MobileFullscreenDialogContentProps {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/** Shared keyboard-safe shell for the four quick-create flows on the dashboard. */
export function MobileFullscreenDialogContent({
  title,
  description,
  children,
  className,
  bodyClassName,
}: MobileFullscreenDialogContentProps) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const bodyRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const content = contentRef.current;
    const body = bodyRef.current;
    if (!content || !body) return;

    const viewport = window.visualViewport;
    let frame = 0;

    const keepFocusedControlVisible = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const active = document.activeElement;
        if (!(active instanceof HTMLElement) || !body.contains(active)) return;

        const viewportBottom = viewport?.height ?? window.innerHeight;
        const rect = active.getBoundingClientRect();
        const headerBottom = content.querySelector<HTMLElement>("[data-mobile-dialog-header]")
          ?.getBoundingClientRect().bottom ?? 0;
        const safeTop = headerBottom + 12;
        const safeBottom = viewportBottom - 20;

        if (rect.top < safeTop || rect.bottom > safeBottom) {
          active.scrollIntoView({ block: "center", behavior: "smooth" });
        }
      });
    };

    const syncViewportHeight = () => {
      const height = viewport?.height ?? window.innerHeight;
      content.style.setProperty("--quick-dialog-viewport-height", `${Math.round(height)}px`);
      keepFocusedControlVisible();
    };

    const handleFocus = (event: FocusEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement) || !target.matches("input, textarea, select, [role='combobox']")) return;
      window.setTimeout(keepFocusedControlVisible, 180);
    };

    syncViewportHeight();
    body.addEventListener("focusin", handleFocus);
    viewport?.addEventListener("resize", syncViewportHeight);
    viewport?.addEventListener("scroll", syncViewportHeight);
    window.addEventListener("orientationchange", syncViewportHeight);

    return () => {
      window.cancelAnimationFrame(frame);
      body.removeEventListener("focusin", handleFocus);
      viewport?.removeEventListener("resize", syncViewportHeight);
      viewport?.removeEventListener("scroll", syncViewportHeight);
      window.removeEventListener("orientationchange", syncViewportHeight);
      content.style.removeProperty("--quick-dialog-viewport-height");
    };
  }, []);

  return (
    <DialogContent
      ref={contentRef}
      hideClose
      data-mobile-fullscreen-dialog
      className={cn(
        "left-0 top-0 flex h-[var(--quick-dialog-viewport-height,100dvh)] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-background p-0 shadow-none duration-0 data-[state=closed]:slide-out-to-left-0 data-[state=closed]:slide-out-to-top-0 data-[state=closed]:zoom-out-100 data-[state=open]:slide-in-from-left-0 data-[state=open]:slide-in-from-top-0 data-[state=open]:zoom-in-100 md:left-[50%] md:top-[50%] md:h-auto md:max-h-[88vh] md:w-[calc(100vw-1.5rem)] md:max-w-2xl md:translate-x-[-50%] md:translate-y-[-50%] md:gap-4 md:rounded-lg md:border md:p-6 md:shadow-lg md:duration-200",
        className,
      )}
    >
      <DialogHeader
        data-mobile-dialog-header
        className="sticky top-0 z-20 shrink-0 border-b bg-background px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] text-left md:static md:border-0 md:p-0"
      >
        <div className="flex min-w-0 items-start justify-between gap-3 pr-0 md:pr-6">
          <div className="min-w-0 space-y-1.5">
            <DialogTitle>{title}</DialogTitle>
            {description ? <DialogDescription>{description}</DialogDescription> : null}
          </div>
          <DialogClose className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:absolute md:right-4 md:top-4 md:h-8 md:w-8">
            <X className="h-5 w-5" />
            <span className="sr-only">Fechar</span>
          </DialogClose>
        </div>
      </DialogHeader>

      <div
        ref={bodyRef}
        data-mobile-dialog-body
        className={cn(
          "min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 [scroll-padding-bottom:6rem] [scroll-padding-top:1rem] md:overflow-y-auto md:p-0",
          bodyClassName,
        )}
      >
        {children}
      </div>
    </DialogContent>
  );
}