import { X, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "./WorkspaceProvider";

/**
 * Horizontal tab bar rendered at the very top of the Workspace shell.
 * Purely presentational — state lives in WorkspaceProvider.
 */
export function TabBar() {
  const ws = useWorkspace();
  if (!ws) return null;

  return (
    <div
      role="tablist"
      aria-label="Abas do workspace"
      className="flex items-stretch h-10 bg-muted/40 border-b border-border overflow-x-auto overflow-y-hidden pl-0 lg:pl-16"
    >
      {ws.tabs.map((tab) => {
        const active = tab.id === ws.activeId;
        const pinned = Boolean(tab.pinned);
        return (
          <div
            key={tab.id}
            role="tab"
            aria-selected={active}
            onClick={() => ws.activateTab(tab.id)}
            onAuxClick={(e) => {
              // middle-click closes — never the pinned home tab
              if (e.button === 1 && !pinned) {
                e.preventDefault();
                ws.closeTab(tab.id);
              }
            }}
            className={cn(
              "group flex items-center gap-2 px-3 min-w-[120px] max-w-[220px] cursor-pointer border-r border-border select-none",
              "text-sm transition-colors",
              active
                ? "bg-background text-foreground border-t-2 border-t-primary -mb-px"
                : "text-muted-foreground hover:bg-background/60",
            )}
            title={`${tab.title}\n${tab.path}`}
          >
            <span className="truncate flex-1">{tab.title}</span>
            {!pinned && (
            <button
              type="button"
              aria-label={`Fechar aba ${tab.title}`}
              onClick={(e) => {
                e.stopPropagation();
                ws.closeTab(tab.id);
              }}
              className="rounded-sm p-0.5 opacity-60 hover:opacity-100 hover:bg-muted"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            )}
          </div>
        );
      })}

      <div className="flex items-center gap-2 px-3 text-xs text-muted-foreground ml-auto shrink-0">
        <Plus className={cn("h-3.5 w-3.5", !ws.canOpenMore && "opacity-30")} />
        <span>
          {ws.contentCount}/{ws.max}
        </span>
      </div>
    </div>
  );
}