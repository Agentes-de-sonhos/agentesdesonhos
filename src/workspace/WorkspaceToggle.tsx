import { useEffect, useState } from "react";
import { Layers } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUserRole } from "@/hooks/useUserRole";
import { getWorkspaceFlag, toggleWorkspaceFlag, WORKSPACE_FLAG_EVENT } from "./featureFlag";

/**
 * Floating admin-only toggle to turn the tabbed Workspace on/off.
 * Reloads the page after toggling so the router structure remounts cleanly.
 */
export function WorkspaceToggle() {
  const { isAdmin, loading } = useUserRole();
  const [enabled, setEnabled] = useState(() => getWorkspaceFlag());

  useEffect(() => {
    const onChange = (e: Event) => setEnabled(!!(e as CustomEvent).detail);
    window.addEventListener(WORKSPACE_FLAG_EVENT, onChange as EventListener);
    return () => window.removeEventListener(WORKSPACE_FLAG_EVENT, onChange as EventListener);
  }, []);

  if (loading || !isAdmin) return null;

  return (
    <button
      type="button"
      onClick={() => {
        toggleWorkspaceFlag();
        // Full reload so BrowserRouter/MemoryRouter tree remounts cleanly.
        setTimeout(() => window.location.reload(), 50);
      }}
      title={enabled ? "Desativar Workspace (abas)" : "Ativar Workspace (abas) — admin"}
      data-workspace-ignore
      className={cn(
        "fixed z-[60] bottom-4 right-4 h-10 px-3 rounded-full shadow-lg border text-xs font-medium",
        "flex items-center gap-2 transition-colors",
        enabled
          ? "bg-primary text-primary-foreground border-primary hover:bg-primary/90"
          : "bg-background text-muted-foreground border-border hover:bg-muted",
      )}
    >
      <Layers className="h-4 w-4" />
      <span>Abas: {enabled ? "ON" : "OFF"}</span>
    </button>
  );
}