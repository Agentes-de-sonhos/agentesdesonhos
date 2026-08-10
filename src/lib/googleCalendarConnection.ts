// Presentation logic for the Google Calendar connection lifecycle.

export type ConnectionState = "connected" | "reconnect_required" | "revoked";

export interface CalendarConnectionStatus {
  connected: boolean;
  connection_state?: ConnectionState | null;
  last_auth_error?: string | null;
  last_auth_error_at?: string | null;
  sync_in_progress?: boolean;
  last_sync_status?: "idle" | "syncing" | "synced" | "error" | null;
  last_sync_at?: string | null;
}

/** True when the user must run the Google consent flow again. */
export function needsReconnect(status: CalendarConnectionStatus | null | undefined): boolean {
  if (!status?.connected) return false;
  return status.connection_state === "reconnect_required" || status.connection_state === "revoked";
}

export type CalendarStatusKey = "reconnect_required" | "syncing" | "error" | "synced" | "idle";

export function resolveStatusKey(
  status: CalendarConnectionStatus | null | undefined,
  isSyncing: boolean,
): CalendarStatusKey {
  if (needsReconnect(status)) return "reconnect_required";
  if (isSyncing || status?.sync_in_progress) return "syncing";
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