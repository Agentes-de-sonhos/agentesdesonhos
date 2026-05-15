const IMPERSONATION_KEY = "impersonation_data";
const IMPERSONATION_CONTEXT_KEY = "impersonation_support_context";

export const IMPERSONATION_EVENT = "impersonation-data-changed";
export const IMPERSONATION_TRANSITION_MS = 60_000;

export interface ImpersonationData {
  adminSessionAccess: string;
  adminSessionRefresh: string;
  targetUserName: string;
  targetUserId: string;
  adminId: string;
  startedAt: string;
  impersonationLogId?: string | null;
}

export function getImpersonationData(): ImpersonationData | null {
  try {
    // Legacy cleanup: the old implementation used localStorage for the banner,
    // which made support mode appear in every open tab on the same domain.
    localStorage.removeItem(IMPERSONATION_KEY);

    const raw = sessionStorage.getItem(IMPERSONATION_KEY);
    if (!raw) return null;

    const data = JSON.parse(raw) as ImpersonationData;
    const startedAt = new Date(data.startedAt).getTime();
    const isExpired = Number.isFinite(startedAt) && Date.now() - startedAt > 8 * 60 * 60 * 1000;
    return isExpired ? null : data;
  } catch {
    return null;
  }
}

export function setImpersonationData(data: ImpersonationData) {
  sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(data));
  localStorage.setItem(
    IMPERSONATION_CONTEXT_KEY,
    JSON.stringify({
      targetUserId: data.targetUserId,
      adminId: data.adminId,
      startedAt: data.startedAt,
      impersonationLogId: data.impersonationLogId ?? null,
    })
  );
  window.dispatchEvent(new Event(IMPERSONATION_EVENT));
}

export function clearImpersonationData() {
  sessionStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem(IMPERSONATION_KEY);
  localStorage.removeItem(IMPERSONATION_CONTEXT_KEY);
  window.dispatchEvent(new Event(IMPERSONATION_EVENT));
}

export function clearCurrentTabImpersonationData() {
  sessionStorage.removeItem(IMPERSONATION_KEY);
  window.dispatchEvent(new Event(IMPERSONATION_EVENT));
}

export function isImpersonating(): boolean {
  return !!getImpersonationData();
}

export function isActiveImpersonatingUser(userId?: string | null): boolean {
  const data = getImpersonationData();
  return !!userId && !!data && data.targetUserId === userId;
}

export function isSupportSessionForUser(userId?: string | null): boolean {
  if (!userId) return false;
  const activeData = getImpersonationData();
  if (activeData?.targetUserId === userId) return true;

  try {
    const raw = localStorage.getItem(IMPERSONATION_CONTEXT_KEY);
    if (!raw) return false;
    const context = JSON.parse(raw) as Pick<ImpersonationData, "targetUserId" | "startedAt">;
    const startedAt = new Date(context.startedAt).getTime();
    if (!Number.isFinite(startedAt) || Date.now() - startedAt > 8 * 60 * 60 * 1000) {
      localStorage.removeItem(IMPERSONATION_CONTEXT_KEY);
      return false;
    }
    return context.targetUserId === userId;
  } catch {
    localStorage.removeItem(IMPERSONATION_CONTEXT_KEY);
    return false;
  }
}