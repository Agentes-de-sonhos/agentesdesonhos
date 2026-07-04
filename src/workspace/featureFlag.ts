/**
 * Feature flag for the Workspace (MDI tabs).
 * Available to: admin role, "premium" plan and "fundador" plan.
 * Default when eligible: ON. The user can opt out in Minha Conta.
 *
 * Because plan/role are fetched async but the router surface must be chosen
 * synchronously at mount, we cache eligibility in localStorage. The initial
 * gate reads the cached value; a small effect keeps the cache in sync and
 * reloads once if it flips so the correct router mounts.
 */
const PREF_KEY = "workspace_tabs_pref";            // "on" | "off"
const ELIGIBLE_KEY = "workspace_tabs_eligible";    // "1"  | "0"
const LEGACY_KEY = "workspace_tabs_enabled";       // migration only

export type WorkspacePref = "on" | "off";

export const WORKSPACE_FLAG_EVENT = "workspace-flag-changed";

function safeGet(key: string): string | null {
  try { return typeof window !== "undefined" ? window.localStorage.getItem(key) : null; } catch { return null; }
}
function safeSet(key: string, value: string | null) {
  try {
    if (value === null) window.localStorage.removeItem(key);
    else window.localStorage.setItem(key, value);
  } catch { /* ignore */ }
}

export function getWorkspacePref(): WorkspacePref | null {
  // One-time migration from the legacy admin-only flag.
  const legacy = safeGet(LEGACY_KEY);
  if (legacy !== null) {
    if (safeGet(PREF_KEY) === null) safeSet(PREF_KEY, legacy === "1" ? "on" : "off");
    safeSet(LEGACY_KEY, null);
  }
  const v = safeGet(PREF_KEY);
  return v === "on" || v === "off" ? v : null;
}

export function setWorkspacePref(pref: WorkspacePref) {
  safeSet(PREF_KEY, pref);
  window.dispatchEvent(new CustomEvent(WORKSPACE_FLAG_EVENT, { detail: pref === "on" }));
}

export function getWorkspaceEligibleCache(): boolean {
  return safeGet(ELIGIBLE_KEY) === "1";
}

export function setWorkspaceEligibleCache(eligible: boolean) {
  safeSet(ELIGIBLE_KEY, eligible ? "1" : "0");
}

/** True when the tabbed workspace should be mounted for this session. */
export function getWorkspaceFlag(): boolean {
  if (!getWorkspaceEligibleCache()) return false;
  // Default ON for eligible users; only "off" explicitly disables.
  return getWorkspacePref() !== "off";
}

export function isWorkspaceEligible(
  role: string | null | undefined,
  plan: string | null | undefined,
): boolean {
  return role === "admin" || plan === "premium" || plan === "fundador";
}