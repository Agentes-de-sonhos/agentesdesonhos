/**
 * Feature flag for the admin-only Workspace (MDI tabs) MVP.
 * Enabled only if BOTH conditions are true:
 *   1. Current user has admin role (checked by caller via useUserRole).
 *   2. localStorage key "workspace_tabs_enabled" === "1".
 *
 * The flag can be toggled via the floating button in the corner (admin only)
 * or manually: localStorage.setItem("workspace_tabs_enabled","1").
 */
const STORAGE_KEY = "workspace_tabs_enabled";

export function getWorkspaceFlag(): boolean {
  try {
    return typeof window !== "undefined" && window.localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function setWorkspaceFlag(enabled: boolean) {
  try {
    if (enabled) window.localStorage.setItem(STORAGE_KEY, "1");
    else window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

/** Event dispatched (on window) whenever the flag changes so listeners can rerender. */
export const WORKSPACE_FLAG_EVENT = "workspace-flag-changed";

export function toggleWorkspaceFlag() {
  const next = !getWorkspaceFlag();
  setWorkspaceFlag(next);
  window.dispatchEvent(new CustomEvent(WORKSPACE_FLAG_EVENT, { detail: next }));
  return next;
}