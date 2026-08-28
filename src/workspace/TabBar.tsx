import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X, Plus, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace, type WorkspaceTab } from "./WorkspaceProvider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { densityForWidth, tabDensity, useViewport } from "@/lib/agencyAdminDensity";

/**
 * Barra de abas do workspace.
 *
 * Layout de uma única linha, SEM rolagem horizontal: as abas encolhem
 * (`flex-shrink` + `min-width: 0`) até a largura mínima legível do modo de
 * densidade atual; o que não couber vai para um seletor compacto ("+N"), de
 * onde qualquer aba pode ser ativada ou fechada. A aba ativa está sempre
 * visível. Estado e limite de abas continuam no WorkspaceProvider.
 */
export function TabBar({ embedded = false }: { embedded?: boolean } = {}) {
  const ws = useWorkspace();
  const { width } = useViewport();
  const d = tabDensity(densityForWidth(width));
  const stripRef = useRef<HTMLDivElement | null>(null);
  const [avail, setAvail] = useState(0);

  // Largura real disponível para as abas (exclui contador/seletor).
  useLayoutEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const measure = () => setAvail(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const tabs = ws?.tabs ?? [];
  const activeId = ws?.activeId ?? null;

  const { visible, hidden } = useMemo(() => {
    if (tabs.length === 0) return { visible: [] as WorkspaceTab[], hidden: [] as WorkspaceTab[] };
    const usable = avail || 640;
    let fit = Math.max(1, Math.floor(usable / d.minTabWidth));
    if (fit >= tabs.length) return { visible: tabs, hidden: [] as WorkspaceTab[] };
    // Reserva espaço para o seletor de abas excedentes.
    fit = Math.max(1, Math.floor((usable - 56) / d.minTabWidth));
    const vis = tabs.slice(0, fit);
    // A aba ativa deve estar sempre visível por completo.
    if (activeId && !vis.some((t) => t.id === activeId)) {
      const active = tabs.find((t) => t.id === activeId);
      if (active) vis[vis.length - 1] = active;
    }
    const visIds = new Set(vis.map((t) => t.id));
    return { visible: vis, hidden: tabs.filter((t) => !visIds.has(t.id)) };
  }, [tabs, activeId, avail, d.minTabWidth]);

  const [overflowOpen, setOverflowOpen] = useState(false);
  useEffect(() => {
    if (hidden.length === 0) setOverflowOpen(false);
  }, [hidden.length]);

  if (!ws) return null;

  return (
    <TooltipProvider>
      <div
        role="tablist"
        aria-label="Abas do workspace"
        className={cn(
          "flex w-full min-w-0 max-w-full items-stretch overflow-hidden border-b border-border bg-muted/40",
          d.bar,
          embedded ? "px-0" : "pl-0 lg:pl-16",
        )}
      >
        <div ref={stripRef} className="flex min-w-0 flex-1 items-stretch overflow-hidden">
          {visible.map((tab) => {
            const active = tab.id === ws.activeId;
            const pinned = Boolean(tab.pinned);
            return (
              <Tooltip key={tab.id} delayDuration={300}>
                <TooltipTrigger asChild>
                  <div
                    role="tab"
                    aria-selected={active}
                    tabIndex={active ? 0 : -1}
                    onClick={() => ws.activateTab(tab.id)}
                    onAuxClick={(e) => {
                      if (e.button === 1 && !pinned) {
                        e.preventDefault();
                        ws.closeTab(tab.id);
                      }
                    }}
                    style={{
                      maxWidth: d.maxTabWidth,
                      ...(active ? { borderTopColor: "var(--wl-accent, hsl(var(--primary)))" } : {}),
                    }}
                    className={cn(
                      "group flex min-w-0 shrink flex-1 basis-0 items-center gap-1.5 border-r border-border select-none",
                      d.tabPadding,
                      d.tabText,
                      "transition-colors",
                      active ? "cursor-default" : "cursor-pointer",
                      active
                        ? "-mb-px border-t-2 bg-background text-foreground"
                        : "text-muted-foreground hover:bg-background/60",
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate whitespace-nowrap">{tab.title}</span>
                    {!pinned && (
                      <button
                        type="button"
                        aria-label={`Fechar aba ${tab.title}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          ws.closeTab(tab.id);
                        }}
                        className="shrink-0 rounded-sm p-0.5 opacity-60 hover:bg-muted hover:opacity-100"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom">{tab.title}</TooltipContent>
              </Tooltip>
            );
          })}

          {hidden.length > 0 && (
            <Popover open={overflowOpen} onOpenChange={setOverflowOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label={`${hidden.length} abas abertas`}
                  className={cn(
                    "flex shrink-0 items-center gap-1 border-r border-border font-medium text-muted-foreground transition-colors hover:bg-background/60",
                    d.tabPadding,
                    d.tabText,
                  )}
                >
                  <span>+{hidden.length}</span>
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" side="bottom" sideOffset={4} className="w-64 p-1.5">
                <div className="max-h-[60vh] space-y-0.5 overflow-y-auto no-scrollbar">
                  {tabs.map((tab) => {
                    const active = tab.id === ws.activeId;
                    return (
                      <div
                        key={tab.id}
                        className={cn(
                          "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm",
                          active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/60",
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            ws.activateTab(tab.id);
                            setOverflowOpen(false);
                          }}
                          className="min-w-0 flex-1 truncate text-left"
                          title={tab.title}
                        >
                          {tab.title}
                        </button>
                        {!tab.pinned && (
                          <button
                            type="button"
                            aria-label={`Fechar aba ${tab.title}`}
                            onClick={() => ws.closeTab(tab.id)}
                            className="shrink-0 rounded-sm p-0.5 opacity-60 hover:bg-background hover:opacity-100"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1.5 px-2 text-[11px] text-muted-foreground">
          <Plus className={cn("h-3.5 w-3.5", !ws.canOpenMore && "opacity-30")} />
          <span>
            {ws.contentCount}/{ws.max}
          </span>
        </div>
      </div>
    </TooltipProvider>
  );
}
