// Presentation logic for the Google Calendar connection lifecycle.

export type ConnectionState = "connected" | "reconnect_required" | "revoked";

export interface CalendarConnectionStatus {
  connected: boolean;
  connection_state?: ConnectionState | null;
  last_auth_error?: string | null;
  last_auth_error_at?: string | null;
  sync_in_progress?: boolean;
  last_sync_status?: "idle" | "syncing" | "synced" | "error" | "bootstrap" | "incremental" | null;
  last_sync_at?: string | null;
  bootstrap_in_progress?: boolean | null;
  bootstrap_pages_done?: number | null;
  bootstrap_items_done?: number | null;
  incremental_in_progress?: boolean | null;
  incremental_pages_done?: number | null;
  incremental_items_done?: number | null;
  granted_scopes?: string | null;
  oauth_scope_version?: number | null;
}

/** True when the user must run the Google consent flow again. */
export function needsReconnect(status: CalendarConnectionStatus | null | undefined): boolean {
  if (!status?.connected) return false;
  return status.connection_state === "reconnect_required" || status.connection_state === "revoked";
}

export const SCOPE_EVENTS = "https://www.googleapis.com/auth/calendar.events";
export const SCOPE_CALENDARS_READONLY =
  "https://www.googleapis.com/auth/calendar.calendars.readonly";
export const SCOPE_CALENDAR_FULL = "https://www.googleapis.com/auth/calendar";

function grantedScopeList(status: CalendarConnectionStatus | null | undefined): string[] {
  const raw = status?.granted_scopes;
  if (typeof raw !== "string" || raw.trim().length === 0) return [];
  return raw.split(/[\s,]+/).filter(Boolean);
}

/**
 * True when the connection was authorized with the old broad scope instead of the
 * current minimal pair. Non-fatal: sync keeps working, we only invite a voluntary
 * reconnect so the grant shrinks to the minimum.
 */
export function hasLegacyBroadScope(status: CalendarConnectionStatus | null | undefined): boolean {
  if (!status?.connected) return false;
  const scopes = grantedScopeList(status);
  if (scopes.length === 0) return false;
  return scopes.includes(SCOPE_CALENDAR_FULL) && !scopes.includes(SCOPE_EVENTS);
}

/** Optional invitation text for a legacy broad grant. Never blocks the sync. */
export function legacyScopeNotice(
  status: CalendarConnectionStatus | null | undefined,
): string | null {
  if (!hasLegacyBroadScope(status)) return null;
  return "Sua conexão usa a permissão antiga e ampla do Google Calendar. A sincronização continua funcionando normalmente. Se quiser, reconecte para reduzir o acesso ao mínimo necessário (apenas eventos e o fuso do calendário).";
}

export type CalendarStatusKey =
  | "reconnect_required"
  | "syncing"
  | "bootstrap"
  | "incremental"
  | "error"
  | "synced"
  | "idle";

/** True while the resumable initial sync still has pages pending. */
export function isBootstrapInProgress(status: CalendarConnectionStatus | null | undefined): boolean {
  if (!status?.connected) return false;
  return status.bootstrap_in_progress === true || status.last_sync_status === "bootstrap";
}

/** True while an incremental (syncToken) walk still has pages pending. */
export function isIncrementalInProgress(status: CalendarConnectionStatus | null | undefined): boolean {
  if (!status?.connected) return false;
  return status.incremental_in_progress === true || status.last_sync_status === "incremental";
}

export function resolveStatusKey(
  status: CalendarConnectionStatus | null | undefined,
  isSyncing: boolean,
): CalendarStatusKey {
  if (needsReconnect(status)) return "reconnect_required";
  if (isSyncing || status?.sync_in_progress) return "syncing";
  // A partial bootstrap must never be presented as "Sincronizado".
  if (isBootstrapInProgress(status)) return "bootstrap";
  // A partial incremental walk is unfinished work too.
  if (isIncrementalInProgress(status)) return "incremental";
  if (status?.last_sync_status === "error") return "error";
  if (status?.last_sync_status === "synced" || status?.last_sync_at) return "synced";
  return "idle";
}

export function statusLabel(key: CalendarStatusKey): string {
  switch (key) {
    case "reconnect_required":
      return "Reconexão necessária";
    case "syncing":
      return "Sincronizando…";
    case "bootstrap":
      return "Sincronização inicial em andamento";
    case "incremental":
      return "Sincronização em andamento";
    case "error":
      return "Erro de sincronização";
    case "synced":
      return "Sincronizado";
    default:
      return "Aguardando";
  }
}

export function statusDotClass(key: CalendarStatusKey): string {
  switch (key) {
    case "reconnect_required":
      return "bg-amber-600";
    case "syncing":
      return "bg-amber-500 animate-pulse";
    case "bootstrap":
      return "bg-sky-500 animate-pulse";
    case "incremental":
      return "bg-sky-500 animate-pulse";
    case "error":
      return "bg-rose-500";
    case "synced":
      return "bg-emerald-500";
    default:
      return "bg-muted-foreground";
  }
}

/** Human-readable reason shown next to the reconnect action. */
export function reconnectMessage(status: CalendarConnectionStatus | null | undefined): string {
  const raw = status?.last_auth_error?.trim();
  if (raw) return raw;
  return "A autorização do Google expirou. Reconecte para retomar a sincronização.";
}

/** Maps a sync response into a user-facing reconnect signal. */
export function isReconnectResponse(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Record<string, unknown>;
  return p.code === "reconnect_required" || p.skipped === "reconnect-required";
}

/** Progress text for the initial sync — never claims completion. */
export function bootstrapProgressLabel(status: CalendarConnectionStatus | null | undefined): string | null {
  if (isBootstrapInProgress(status)) {
    const items = status?.bootstrap_items_done ?? 0;
    const pages = status?.bootstrap_pages_done ?? 0;
    if (!items && !pages) return "Sincronização inicial em andamento…";
    return `Sincronização inicial em andamento · ${items} eventos em ${pages} páginas`;
  }
  if (isIncrementalInProgress(status)) {
    const items = status?.incremental_items_done ?? 0;
    const pages = status?.incremental_pages_done ?? 0;
    if (!items && !pages) return "Sincronização em andamento…";
    return `Sincronização em andamento · ${items} eventos em ${pages} páginas`;
  }
  return null;
}